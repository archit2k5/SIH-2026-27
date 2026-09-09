import { query } from "../config/db.js";

export class AIQueryLogModel {
    /**
     * Log an AI / RAG query execution for compliance and auditing (FR21)
     */
    static async logQuery({
        userId,
        caseId = null,
        queryText,
        retrievedChunkIds = [],
        responseText = "",
        citations = [],
    }) {
        const sql = `
            INSERT INTO ai_query_log (
                user_id, case_id, query_text, retrieved_chunk_ids, response_text, citations
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await query(sql, [
            userId,
            caseId,
            queryText,
            retrievedChunkIds,
            responseText,
            JSON.stringify(citations),
        ]);

        return result.rows[0];
    }

    /**
     * List AI query audit logs for a specific case
     */
    static async listByCase(caseId) {
        const sql = `
            SELECT q.*, u.name as user_name, u.role as user_role
            FROM ai_query_log q
            JOIN users u ON q.user_id = u.id
            WHERE q.case_id = $1
            ORDER BY q.timestamp DESC
        `;
        const result = await query(sql, [caseId]);
        return result.rows;
    }

    /**
     * List AI query audit logs performed by a specific user
     */
    static async listByUser(userId) {
        const sql = `
            SELECT q.*, c.case_number
            FROM ai_query_log q
            LEFT JOIN cases c ON q.case_id = c.id
            WHERE q.user_id = $1
            ORDER BY q.timestamp DESC
        `;
        const result = await query(sql, [userId]);
        return result.rows;
    }
}
