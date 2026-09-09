import { query, withTransaction } from "../config/db.js";

export class ExtractedFieldModel {
    /**
     * Save multiple NER extracted fields for a document
     * @param {string} documentId
     * @param {Array<{ fieldName: string, fieldValue: string, confidence?: number }>} fields
     */
    static async saveFields(documentId, fields = []) {
        if (!fields || fields.length === 0) return [];

        return await withTransaction(async (client) => {
            const inserted = [];
            for (const f of fields) {
                const sql = `
                    INSERT INTO extracted_fields (document_id, field_name, field_value, confidence)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                `;
                const res = await client.query(sql, [
                    documentId,
                    f.fieldName,
                    f.fieldValue,
                    f.confidence !== undefined ? f.confidence : 1.0,
                ]);
                inserted.push(res.rows[0]);
            }
            return inserted;
        });
    }

    /**
     * Get all extracted fields for a document
     */
    static async getByDocumentId(documentId) {
        const sql = `
            SELECT ef.*, u.name as verifier_name
            FROM extracted_fields ef
            LEFT JOIN users u ON ef.verified_by = u.id
            WHERE ef.document_id = $1
            ORDER BY ef.created_at ASC
        `;
        const result = await query(sql, [documentId]);
        return result.rows;
    }

    /**
     * Officer verifies/edits fields, binding their ID and setting verification state
     * @param {string} documentId 
     * @param {string} verifiedBy 
     * @param {Array<{ id?: string, fieldName: string, fieldValue: string }>} confirmedFields 
     */
    static async verifyFields(documentId, verifiedBy, confirmedFields = []) {
        return await withTransaction(async (client) => {
            // Delete existing unverified/old fields if full replacement is provided
            if (confirmedFields.length > 0) {
                await client.query("DELETE FROM extracted_fields WHERE document_id = $1", [documentId]);
                
                const verified = [];
                for (const f of confirmedFields) {
                    const sql = `
                        INSERT INTO extracted_fields (
                            document_id, field_name, field_value, confidence,
                            verified_by, is_verified, verified_at
                        )
                        VALUES ($1, $2, $3, 1.0, $4, TRUE, NOW())
                        RETURNING *
                    `;
                    const res = await client.query(sql, [
                        documentId,
                        f.fieldName,
                        f.fieldValue,
                        verifiedBy,
                    ]);
                    verified.push(res.rows[0]);
                }
                return verified;
            } else {
                // Otherwise simply mark existing fields as verified
                const sql = `
                    UPDATE extracted_fields
                    SET is_verified = TRUE, verified_by = $1, verified_at = NOW()
                    WHERE document_id = $2
                    RETURNING *
                `;
                const res = await client.query(sql, [verifiedBy, documentId]);
                return res.rows;
            }
        });
    }
}
