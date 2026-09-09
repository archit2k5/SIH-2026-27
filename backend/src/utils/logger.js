/**
 * Simple structured logger for SIH DMS backend
 */
export const Logger = {
    info(message, meta = {}) {
        console.log(`[INFO]  [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : "");
    },

    warn(message, meta = {}) {
        console.warn(`[WARN]  [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : "");
    },

    error(message, error = null, meta = {}) {
        console.error(
            `[ERROR] [${new Date().toISOString()}] ${message}`,
            error ? (error.stack || error.message || error) : "",
            Object.keys(meta).length ? JSON.stringify(meta) : ""
        );
    },

    audit(action, { actorId, documentId, caseId, details = {} }) {
        console.log(
            `[AUDIT] [${new Date().toISOString()}] ACTION=${action} ACTOR=${actorId || "SYSTEM"} DOC=${documentId || "N/A"} CASE=${caseId || "N/A"}`,
            JSON.stringify(details)
        );
    }
};
