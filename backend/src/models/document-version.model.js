import { query } from "../config/db.js";

export class DocumentVersionModel {
    /**
     * Create a new version record for a document
     */
    static async createVersion({
        documentId,
        versionNumber,
        storagePath,
        hash,
        createdBy,
        changeSummary = "Initial version",
    }) {
        const sql = `
            INSERT INTO document_versions (
                document_id, version_number, storage_path, hash, created_by, change_summary
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await query(sql, [
            documentId,
            versionNumber,
            storagePath,
            hash,
            createdBy,
            changeSummary,
        ]);

        return result.rows[0];
    }

    /**
     * Get all version entries for a document ordered by version descending
     */
    static async getVersionsByDocumentId(documentId) {
        const sql = `
            SELECT dv.*, u.name as creator_name
            FROM document_versions dv
            LEFT JOIN users u ON dv.created_by = u.id
            WHERE dv.document_id = $1
            ORDER BY dv.version_number DESC
        `;
        const result = await query(sql, [documentId]);
        return result.rows;
    }

    /**
     * Get a specific version of a document
     */
    static async getSpecificVersion(documentId, versionNumber) {
        const sql = `
            SELECT dv.*, u.name as creator_name
            FROM document_versions dv
            LEFT JOIN users u ON dv.created_by = u.id
            WHERE dv.document_id = $1 AND dv.version_number = $2
            LIMIT 1
        `;
        const result = await query(sql, [documentId, versionNumber]);
        return result.rows[0] || null;
    }
}
