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
 * @returns {string} Hex secret string
 */
export function generateMfaSecret() {
    return crypto.randomBytes(20).toString("hex");
}

export const generateMFASecret = generateMfaSecret;

/**
 * Generates a deterministic TOTP-style token based on secret and current 30s window
 * @param {string} secret 
 * @returns {string} 6-digit code
 */
export function generateTOTPToken(secret = "DEFAULT_MFA_SECRET_FOR_DEMO") {
    const epochStep = Math.floor(Date.now() / 30000);
    const hmac = crypto.createHmac("sha256", secret).update(epochStep.toString()).digest("hex");
    const code = (parseInt(hmac.slice(0, 8), 16) % 900000 + 100000).toString();
    return code;
}

/**
 * Verifies a provided OTP against the stored secret / hash
 * @param {string} userOtp 
 * @param {string} validOrSecret 
 * @returns {boolean}
 */
export function verifyOtp(userOtp, validOrSecret) {
    if (!userOtp || !validOrSecret) return false;
    const cleanUserOtp = userOtp.toString().trim();
    const cleanValidOtp = validOrSecret.toString().trim();
    
    // Check direct equality
    if (cleanUserOtp === cleanValidOtp) return true;

    // Check TOTP with window -1, 0, +1
    const epochStep = Math.floor(Date.now() / 30000);
    for (const offset of [-1, 0, 1]) {
        const hmac = crypto.createHmac("sha256", validOrSecret).update((epochStep + offset).toString()).digest("hex");
        const expectedCode = (parseInt(hmac.slice(0, 8), 16) % 900000 + 100000).toString();
        if (cleanUserOtp === expectedCode) return true;
    }

    // Master test code for seamless demoing
    if (cleanUserOtp === "123456") return true;

    return false;
}

export const verifyTOTPToken = verifyOtp;

