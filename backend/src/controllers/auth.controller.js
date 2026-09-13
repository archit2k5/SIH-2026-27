import { UserModel } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { generateAccessToken, generateRefreshToken, generateMfaToken, verifyMfaToken } from "../utils/token.js";
import { generateMFASecret, verifyTOTPToken, generateTOTPToken } from "../utils/mfa.js";
import { sendOtpMail } from "../utils/mail.js";
import { ENV } from "../config/env.js";
import { Logger } from "../utils/logger.js";

export class AuthController {
    /**
     * User Login (OAuth2 / Password)
     * POST /api/v1/auth/login
     */
    static login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new ApiError(400, "Email and password are required.");
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new ApiError(401, "Invalid email or password credentials.");
        }

        const isPasswordValid = await UserModel.verifyPassword(password, user.password);
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid email or password credentials.");
        }

        // If MFA is enabled, enforce 2FA verification step (FR11)
        if (user.mfa_enabled) {
            const mfaToken = generateMfaToken(user);
            let otp = null;
            if (user.mfa_secret) {
                otp = generateTOTPToken(user.mfa_secret);
            } else {
                otp = "123456";
            }

            // Attempt email dispatch (non-blocking if SMTP is not configured)
            try {
                await sendOtpMail(user.email, otp, user.name);
            } catch (err) {
                Logger.warn("Failed to dispatch OTP email", { error: err.message });
            }

            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        requiresMfa: true,
                        mfaToken,
                        // In development mode, provide OTP for effortless testing and demoing
                        ...(ENV.NODE_ENV === "development" ? { demoOtp: otp } : {}),
                    },
                    "Two-factor authentication required. Verification OTP has been generated."
                )
            );
        }

        // Generate session tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const cookieOptions = {
            httpOnly: true,
            secure: ENV.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };

        res.cookie("accessToken", accessToken, cookieOptions);
        res.cookie("refreshToken", refreshToken, cookieOptions);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        publicKey: user.public_key,
                        mfaEnabled: user.mfa_enabled,
                    },
                    accessToken,
                    refreshToken,
                },
                "Login successful. Session established."
            )
        );
    });

    /**
     * Verify MFA OTP
     * POST /api/v1/auth/mfa/verify
     */
    static verifyMfa = asyncHandler(async (req, res) => {
        const { mfaToken, otp } = req.body;

        if (!mfaToken || !otp) {
            throw new ApiError(400, "MFA token and OTP code are required.");
        }

        let decoded;
        try {
            decoded = verifyMfaToken(mfaToken);
        } catch {
            throw new ApiError(401, "MFA session expired or invalid. Please log in again.");
        }

        const user = await UserModel.findById(decoded.id);
        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        // Verify OTP against secret or demo master OTP
        const isValidOtp = verifyTOTPToken(otp, user.mfa_secret || "DEFAULT_MFA_SECRET_FOR_DEMO");
        if (!isValidOtp) {
            throw new ApiError(401, "Invalid or expired MFA OTP code.");
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const cookieOptions = {
            httpOnly: true,
            secure: ENV.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };

        res.cookie("accessToken", accessToken, cookieOptions);
        res.cookie("refreshToken", refreshToken, cookieOptions);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        publicKey: user.public_key,
                        mfaEnabled: user.mfa_enabled,
                    },
                    accessToken,
                    refreshToken,
                },
                "MFA verification successful. Session established."
            )
        );
    });

    /**
     * Setup MFA for authenticated user
     * POST /api/v1/auth/mfa/setup
     */
    static setupMfa = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const secret = generateMFASecret();

        await UserModel.updateMfaStatus(userId, {
            mfaEnabled: true,
            mfaSecret: secret,
        });

        const currentOtp = generateTOTPToken(secret);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    mfaSecret: secret,
                    currentOtp,
                },
                "Two-Factor Authentication enabled successfully."
            )
        );
    });

    /**
     * Logout & invalidate session
     * POST /api/v1/auth/logout
     */
    static logout = asyncHandler(async (req, res) => {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        return res.status(200).json(new ApiResponse(200, {}, "Logged out successfully. Session invalidated."));
    });

    /**
     * Get Current Authenticated User Profile
     * GET /api/v1/auth/me
     */
    static getMe = asyncHandler(async (req, res) => {
        const user = await UserModel.findById(req.user.id);
        if (!user) {
            throw new ApiError(404, "User profile not found.");
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        publicKey: user.public_key,
                        mfaEnabled: user.mfa_enabled,
                        createdAt: user.created_at,
                    },
                },
                "User profile retrieved successfully."
            )
        );
    });
}
