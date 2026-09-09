import { query } from "../config/db.js";
import { ALL_CASE_STATUSES, CASE_STATUS } from "../utils/constants.js";

export class CaseModel {
    /**
     * Create a new case
     */
    static async create({ caseNumber, title, description = "", status = CASE_STATUS.OPEN, createdBy }) {
        if (!ALL_CASE_STATUSES.includes(status)) {
            throw new Error(`Invalid status: ${status}. Valid statuses: ${ALL_CASE_STATUSES.join(", ")}`);
        }

        const sql = `
            INSERT INTO cases (case_number, title, description, status, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await query(sql, [caseNumber.trim(), title.trim(), description, status, createdBy]);
        return result.rows[0];
    }

    /**
     * Find case by ID
     */
    static async findById(id) {
        const sql = `SELECT * FROM cases WHERE id = $1 LIMIT 1`;
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Find case by unique case number
     */
    static async findByCaseNumber(caseNumber) {
        const sql = `SELECT * FROM cases WHERE case_number = $1 LIMIT 1`;
        const result = await query(sql, [caseNumber.trim()]);
        return result.rows[0] || null;
    }

    /**
     * List cases accessible by a specific user (either created by user, granted in case_access, or admin)
     */
    static async listForUser(userId, isAdminOrRegistrar = false) {
        if (isAdminOrRegistrar) {
            const sql = `
                SELECT c.*, u.name as creator_name
                FROM cases c
                LEFT JOIN users u ON c.created_by = u.id
                ORDER BY c.created_at DESC
            `;
            const result = await query(sql);
            return result.rows;
        }

        const sql = `
            SELECT DISTINCT c.*, ca.access_level, ca.expires_at, u.name as creator_name
            FROM cases c
            LEFT JOIN case_access ca ON c.id = ca.case_id AND ca.user_id = $1
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.created_by = $1
               OR (ca.user_id = $1 AND (ca.expires_at IS NULL OR ca.expires_at > NOW()))
            ORDER BY c.created_at DESC
        `;
        const result = await query(sql, [userId]);
        return result.rows;
    }

    /**
     * Update case status (e.g. open -> under_trial -> closed)
     */
    static async updateStatus(id, status) {
        if (!ALL_CASE_STATUSES.includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }
        const sql = `
            UPDATE cases
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;
        const result = await query(sql, [status, id]);
        return result.rows[0] || null;
    }
}
