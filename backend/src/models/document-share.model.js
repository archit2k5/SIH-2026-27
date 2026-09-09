import { query } from "../config/db.js";

export class DocumentShareModel {
    /**
     * Create a time-limited watermarked share link (FR24)
     */
    static async create({ documentId, shareToken, expiresAt, createdBy, watermarkText = "" }) {
        const sql = `
            INSERT INTO document_shares (document_id, share_token, expires_at, created_by, watermark_text)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await query(sql, [documentId, shareToken, expiresAt, createdBy, watermarkText]);
        return result.rows[0];
    }

    /**
     * Find active share by token and check validity
     */
    static async findValidByToken(shareToken) {
        const sql = `
            SELECT ds.*, d.title as document_title, d.doc_type, d.storage_path, d.verified
            FROM document_shares ds
            JOIN documents d ON ds.document_id = d.id
            WHERE ds.share_token = $1 AND ds.expires_at > NOW()
            LIMIT 1
        `;
        const result = await query(sql, [shareToken]);
        return result.rows[0] || null;
    }

    /**
     * Record an access view for the shared link
     */
    static async incrementAccessCount(shareToken) {
        const sql = `
            UPDATE document_shares
            SET access_count = access_count + 1
            WHERE share_token = $1
            RETURNING access_count
        `;
        const result = await query(sql, [shareToken]);
        return result.rows[0]?.access_count;
    }
}
