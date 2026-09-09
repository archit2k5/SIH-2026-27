import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ENV } from "../config/env.js";

/**
 * Generates an Access Token for authenticated session
 * @param {Object} user 
 * @returns {string} JWT access token
 */
export function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        },
        ENV.JWT_ACCESS_SECRET,
        { expiresIn: ENV.JWT_ACCESS_EXPIRY }
    );
}

/**
 * Generates a Refresh Token
 * @param {Object} user 
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id },
        ENV.JWT_REFRESH_SECRET,
        { expiresIn: ENV.JWT_REFRESH_EXPIRY }
    );
}

/**
 * Generates a temporary pre-MFA verification token (short-lived)
 * @param {Object} user 
 * @returns {string} JWT MFA token
 */
export function generateMfaToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            requiresMfa: true,
        },
        ENV.JWT_MFA_SECRET,
        { expiresIn: ENV.JWT_MFA_EXPIRY }
    );
}

/**
 * Verifies and decodes an Access Token
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
export function verifyAccessToken(token) {
    return jwt.verify(token, ENV.JWT_ACCESS_SECRET);
}

/**
 * Verifies and decodes a Refresh Token
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
export function verifyRefreshToken(token) {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET);
}

/**
 * Verifies a pre-MFA token
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
export function verifyMfaToken(token) {
    return jwt.verify(token, ENV.JWT_MFA_SECRET);
}

/**
 * Generates a cryptographically secure random URL-safe token (e.g. for sharing links)
 * @param {number} [bytes=32] 
 * @returns {string} URL-safe hex string
 */
export function generateSecureToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("hex");
}
