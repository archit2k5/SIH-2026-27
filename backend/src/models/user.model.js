import bcrypt from "bcrypt";
import { query } from "../config/db.js";
import { ALL_ROLES, ROLES } from "../utils/constants.js";

export class UserModel {
    /**
     * Create a new user with hashed password
     */
    static async create({ name, email, password, role = ROLES.IO, publicKey = null, mfaEnabled = false, mfaSecret = null }) {
        if (!ALL_ROLES.includes(role)) {
            throw new Error(`Invalid role: ${role}. Valid roles are: ${ALL_ROLES.join(", ")}`);
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const sql = `
            INSERT INTO users (name, email, password, role, public_key, mfa_enabled, mfa_secret)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, email, role, public_key, mfa_enabled, created_at, updated_at
        `;

        const result = await query(sql, [
            name,
            email.toLowerCase().trim(),
            passwordHash,
            role,
            publicKey,
            mfaEnabled,
            mfaSecret,
        ]);

        return result.rows[0];
    }

    /**
     * Find user by email (includes password hash for authentication)
     */
    static async findByEmail(email) {
        const sql = `SELECT * FROM users WHERE email = $1 LIMIT 1`;
        const result = await query(sql, [email.toLowerCase().trim()]);
        return result.rows[0] || null;
    }

    /**
     * Find user by ID (excludes password hash)
     */
    static async findById(id) {
        const sql = `
            SELECT id, name, email, role, public_key, mfa_enabled, created_at, updated_at
            FROM users WHERE id = $1 LIMIT 1
        `;
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Verify plain text password against stored hash
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Update user's public key (for digital signatures)
     */
    static async updatePublicKey(id, publicKey) {
        const sql = `
            UPDATE users
            SET public_key = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, email, role, public_key, updated_at
        `;
        const result = await query(sql, [publicKey, id]);
        return result.rows[0] || null;
    }

    /**
     * Update user MFA configuration
     */
    static async updateMfaStatus(id, { mfaEnabled, mfaSecret = null }) {
        const sql = `
            UPDATE users
            SET mfa_enabled = $1, mfa_secret = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id, name, email, mfa_enabled, updated_at
        `;
        const result = await query(sql, [mfaEnabled, mfaSecret, id]);
        return result.rows[0] || null;
    }

    /**
     * List all users (for Admin dashboard)
     */
    static async listAll() {
        const sql = `
            SELECT id, name, email, role, public_key, mfa_enabled, created_at, updated_at
            FROM users ORDER BY created_at DESC
        `;
        const result = await query(sql);
        return result.rows;
    }

    /**
     * Update role of a user
     */
    static async updateRole(id, role) {
        if (!ALL_ROLES.includes(role)) {
            throw new Error(`Invalid role: ${role}`);
        }
        const sql = `
            UPDATE users
            SET role = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, email, role, updated_at
        `;
        const result = await query(sql, [role, id]);
        return result.rows[0] || null;
    }
}
