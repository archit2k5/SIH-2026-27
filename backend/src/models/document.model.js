import { query } from "../config/db.js";
import { ALL_DOC_TYPES, DOC_TYPE } from "../utils/constants.js";

export class DocumentModel {
    /**
     * Create a new document entry in database
     */
    static async create({
        caseId,
        docType = DOC_TYPE.OTHER,
        title,
        storagePath,
        originalHash,
        language = "en",
        verified = false,
        uploadedBy,
    }) {
        if (!ALL_DOC_TYPES.includes(docType)) {
            throw new Error(`Invalid document type: ${docType}`);
        }

        const sql = `
            INSERT INTO documents (
                case_id, doc_type, title, storage_path, original_hash,
                language, verified, current_version, uploaded_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)
            RETURNING *
        `;

        const result = await query(sql, [
            caseId,
            docType,
            title.trim(),
            storagePath,
            originalHash,
            language,
            verified,
            uploadedBy,
        ]);

        return result.rows[0];
    }

    /**
     * Find document by ID
     */
    static async findById(id) {
        const sql = `
            SELECT d.*, u.name as uploader_name, c.case_number
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            LEFT JOIN cases c ON d.case_id = c.id
            WHERE d.id = $1 LIMIT 1
        `;
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Find duplicate document by its raw SHA-256 hash (FR4)
     */
    static async findByHash(originalHash) {
        const sql = `
            SELECT d.*, c.case_number
            FROM documents d
            JOIN cases c ON d.case_id = c.id
            WHERE d.original_hash = $1 LIMIT 1
        `;
        const result = await query(sql, [originalHash]);
        return result.rows[0] || null;
    }

    /**
     * List documents in a case. Optionally filter for only verified (for RAG/AI search)
     */
    static async listByCase(caseId, onlyVerified = false) {
        let sql = `
            SELECT d.*, u.name as uploader_name
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            WHERE d.case_id = $1
        `;
        const params = [caseId];

        if (onlyVerified) {
            sql += ` AND d.verified = TRUE`;
        }

        sql += ` ORDER BY d.created_at DESC`;

        const result = await query(sql, params);
        return result.rows;
    }

    /**
     * Update verified status (human verification gate)
     */
    static async setVerifiedStatus(id, verified = true) {
        const sql = `
            UPDATE documents
            SET verified = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;
        const result = await query(sql, [verified, id]);
        return result.rows[0] || null;
    }

    /**
     * Increment current version counter when a new version is created
     */
    static async incrementVersion(id) {
        const sql = `
            UPDATE documents
            SET current_version = current_version + 1, updated_at = NOW()
            WHERE id = $1
            RETURNING current_version
        `;
        const result = await query(sql, [id]);
        return result.rows[0]?.current_version;
    }

    /**
     * Update security sensitivity level of a document
     */
    static async updateSensitivity(id, sensitivity) {
        const sql = `
            UPDATE documents
            SET sensitivity = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;
        const result = await query(sql, [sensitivity, id]);
        return result.rows[0] || null;
    }
}

