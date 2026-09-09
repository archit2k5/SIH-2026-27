import crypto from "crypto";

/**
 * Generates a 6-digit numeric One-Time Password (OTP)
 * @returns {string} 6-digit string
 */
export function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generates an MFA secret key for the user
 * @returns {string} Base32/hex secret string
 */
export function generateMfaSecret() {
    return crypto.randomBytes(20).toString("hex");
}

/**
 * Verifies a provided OTP against the stored secret / hash
 * @param {string} userOtp 
 * @param {string} validOtp 
 * @returns {boolean}
 */
export function verifyOtp(userOtp, validOtp) {
    if (!userOtp || !validOtp) return false;
    const cleanUserOtp = userOtp.toString().trim();
    const cleanValidOtp = validOtp.toString().trim();
    
    // Constant-time comparison to prevent timing attacks
    if (cleanUserOtp.length !== cleanValidOtp.length) return false;
    return crypto.timingSafeEqual(Buffer.from(cleanUserOtp), Buffer.from(cleanValidOtp));
}
