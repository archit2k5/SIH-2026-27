import { query } from "../config/db.js";

export class NotificationModel {
    /**
     * Create a notification for a user (FR23)
     */
    static async create({ userId, caseId = null, title, message }) {
        const sql = `
            INSERT INTO notifications (user_id, case_id, title, message)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await query(sql, [userId, caseId, title, message]);
        return result.rows[0];
    }

    /**
     * List notifications for a user
     */
    static async listForUser(userId, unreadOnly = false) {
        let sql = `
            SELECT n.*, c.case_number
            FROM notifications n
            LEFT JOIN cases c ON n.case_id = c.id
            WHERE n.user_id = $1
        `;
        const params = [userId];

        if (unreadOnly) {
            sql += ` AND n.is_read = FALSE`;
        }

        sql += ` ORDER BY n.created_at DESC LIMIT 50`;

        const result = await query(sql, params);
        return result.rows;
    }

    /**
     * Mark a notification as read
     */
    static async markAsRead(id, userId) {
        const sql = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await query(sql, [id, userId]);
        return result.rows[0] || null;
    }
}
