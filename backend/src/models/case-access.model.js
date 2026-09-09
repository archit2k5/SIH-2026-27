import { query } from "../config/db.js";
import { ACCESS_LEVEL, ALL_ACCESS_LEVELS } from "../utils/constants.js";

export class CaseAccessModel {
    /**
     * Grant or update case access for a user
     */
    static async grantAccess({ caseId, userId, accessLevel = ACCESS_LEVEL.READ, expiresAt = null, grantedBy }) {
        if (!ALL_ACCESS_LEVELS.includes(accessLevel)) {
            throw new Error(`Invalid access level: ${accessLevel}`);
        }

        const sql = `
            INSERT INTO case_access (case_id, user_id, access_level, expires_at, granted_by)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (case_id, user_id) DO UPDATE
            SET access_level = EXCLUDED.access_level,
                expires_at = EXCLUDED.expires_at,
                granted_by = EXCLUDED.granted_by,
                created_at = NOW()
            RETURNING *
        `;

        const result = await query(sql, [caseId, userId, accessLevel, expiresAt, grantedBy]);
        return result.rows[0];
    }

    /**
     * Revoke case access for a user
     */
    static async revokeAccess(caseId, userId) {
        const sql = `DELETE FROM case_access WHERE case_id = $1 AND user_id = $2 RETURNING *`;
        const result = await query(sql, [caseId, userId]);
        return result.rows[0] || null;
    }

    /**
     * Check if a user has specific access level on a case (takes into account time expiration)
     * Hierarchy: approve > write > read
     */
    static async hasAccess(userId, caseId, requiredLevel = ACCESS_LEVEL.READ) {
        const levelsHierarchy = {
            [ACCESS_LEVEL.READ]: 1,
            [ACCESS_LEVEL.WRITE]: 2,
            [ACCESS_LEVEL.APPROVE]: 3,
        };

        const sql = `
            SELECT ca.access_level, ca.expires_at
            FROM case_access ca
            WHERE ca.case_id = $1 AND ca.user_id = $2
              AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
            LIMIT 1
        `;

        const result = await query(sql, [caseId, userId]);
        if (result.rows.length === 0) return false;

        const userLevel = result.rows[0].access_level;
        return (levelsHierarchy[userLevel] || 0) >= (levelsHierarchy[requiredLevel] || 0);
    }

    /**
     * List all users with granted access for a case
     */
    static async listAccessForCase(caseId) {
        const sql = `
            SELECT ca.*, u.name as user_name, u.email as user_email, u.role as user_role,
                   granter.name as granted_by_name
            FROM case_access ca
            JOIN users u ON ca.user_id = u.id
            LEFT JOIN users granter ON ca.granted_by = granter.id
            WHERE ca.case_id = $1
            ORDER BY ca.created_at DESC
        `;
        const result = await query(sql, [caseId]);
        return result.rows;
    }
}
