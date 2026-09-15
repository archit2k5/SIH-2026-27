import { query } from "../config/db.js";

export class DocumentContentModel {
    /**
     * Store or update extracted text for a document.
     */
    static async createOrUpdate({
        documentId,
        extractedText,
        extractionMethod = null,
        pageCount = null,
    }) {
        const sql = `
            INSERT INTO document_contents (
                document_id,
                extracted_text,
                extraction_method,
                page_count
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (document_id)
            DO UPDATE SET
                extracted_text = EXCLUDED.extracted_text,
                extraction_method = EXCLUDED.extraction_method,
                page_count = EXCLUDED.page_count,
                updated_at = NOW()
            RETURNING *
        `;

        const result = await query(sql, [
            documentId,
            extractedText || "",
            extractionMethod,
            pageCount,
        ]);

        return result.rows[0];
    }

    /**
     * Get extracted content for a document.
     */
    static async getByDocumentId(documentId) {
        const sql = `
            SELECT *
            FROM document_contents
            WHERE document_id = $1
            LIMIT 1
        `;

        const result = await query(sql, [documentId]);

        return result.rows[0] || null;
    }
}