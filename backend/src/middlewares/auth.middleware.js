import { verifyAccessToken } from "../utils/token.js";
import { ApiError } from "../utils/api-error.js";
import { UserModel } from "../models/user.model.js";

/**
 * Middleware to authenticate requests using JWT Access Token.
 * Populates req.user with verified user payload.
 */
export async function authenticate(req, res, next) {
    try {
        let token = null;

        // Extract from Authorization header (Bearer <token>)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return next(new ApiError(401, "Authentication required: No bearer token or access cookie provided."));
        }

        let decoded;
        try {
            decoded = verifyAccessToken(token);
        } catch (jwtErr) {
            if (jwtErr.name === "TokenExpiredError") {
                return next(new ApiError(401, "Session expired. Please log in again."));
            }
            return next(new ApiError(401, "Invalid access token."));
        }

        // Verify that user still exists in database
        const user = await UserModel.findById(decoded.id);
        if (!user) {
            return next(new ApiError(401, "Authenticated user account no longer exists."));
        }

        // Check if pre-mfa token is mistakenly used as a session token
        if (decoded.requiresMfa) {
            return next(new ApiError(401, "MFA verification pending. Complete OTP verification to obtain full session token."));
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            publicKey: user.public_key,
            mfaEnabled: user.mfa_enabled,
        };

        next();
    } catch (error) {
        next(error);
    }
}
