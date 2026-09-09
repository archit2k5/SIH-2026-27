import { query } from "../config/db.js";

export class CommentModel {
    /**
     * Add an annotation or comment to a case document (FR22)
     */
    static async create({ documentId, userId, content }) {
        const sql = `
            INSERT INTO comments (document_id, user_id, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await query(sql, [documentId, userId, content.trim()]);
        return result.rows[0];
    }

    /**
     * List all comments for a document in chronological order
     */
    static async listByDocument(documentId) {
        const sql = `
            SELECT c.*, u.name as author_name, u.role as author_role
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.document_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await query(sql, [documentId]);
        return result.rows;
    }
}
