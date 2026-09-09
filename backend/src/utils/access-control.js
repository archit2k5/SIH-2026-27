import { ACCESS_LEVEL, ROLE_CLEARANCE, ROLES, SENSITIVITY_LEVEL } from "./constants.js";

/**
 * Access Control and Permission Helper implementing the Four-Point Check
 * (API Gateway -> Case-level -> Document Sensitivity -> RAG Retrieval)
 */
export class AccessControl {
    /**
     * Check if user role is high-level administrator or registrar with blanket access
     * @param {string} role 
     * @returns {boolean}
     */
    static isAdminOrRegistrar(role) {
        return role === ROLES.ADMIN || role === ROLES.REGISTRAR;
    }

    /**
     * Checks if a user's role has sufficient security clearance for a document's sensitivity
     * @param {string} userRole 
     * @param {string} documentSensitivity - one of SENSITIVITY_LEVEL
     * @returns {boolean}
     */
    static hasClearance(userRole, documentSensitivity = SENSITIVITY_LEVEL.PUBLIC) {
        if (!userRole) return false;
        if (userRole === ROLES.ADMIN || userRole === ROLES.JUDGE) return true;

        const sensitivityRank = {
            [SENSITIVITY_LEVEL.PUBLIC]: 0,
            [SENSITIVITY_LEVEL.RESTRICTED]: 1,
            [SENSITIVITY_LEVEL.CONFIDENTIAL]: 2,
            [SENSITIVITY_LEVEL.SECRET]: 3,
        };

        const userClearance = ROLE_CLEARANCE[userRole] || SENSITIVITY_LEVEL.PUBLIC;
        return (sensitivityRank[userClearance] || 0) >= (sensitivityRank[documentSensitivity] || 0);
    }

    /**
     * Verify whether an access level meets or exceeds the required level
     * Hierarchy: approve (3) > write (2) > read (1)
     * @param {string} grantedLevel 
     * @param {string} requiredLevel 
     * @returns {boolean}
     */
    static meetsAccessLevel(grantedLevel, requiredLevel = ACCESS_LEVEL.READ) {
        const hierarchy = {
            [ACCESS_LEVEL.READ]: 1,
            [ACCESS_LEVEL.WRITE]: 2,
            [ACCESS_LEVEL.APPROVE]: 3,
        };

        return (hierarchy[grantedLevel] || 0) >= (hierarchy[requiredLevel] || 0);
    }
}
