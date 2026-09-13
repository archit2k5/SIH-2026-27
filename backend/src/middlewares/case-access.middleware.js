import { ApiError } from "../utils/api-error.js";
import { ACCESS_LEVEL, ROLES } from "../utils/constants.js";
import { AccessControl } from "../utils/access-control.js";
import { CaseModel } from "../models/case.model.js";
import { CaseAccessModel } from "../models/case-access.model.js";
import { DocumentModel } from "../models/document.model.js";

/**
 * Middleware factory to enforce Case-Level Access (Point 2 of Four-Point Check).
 * Checks whether user is an Admin/Registrar, or is the creator of the case, or is granted valid access in case_access.
 * 
 * @param {string} requiredLevel - One of ACCESS_LEVEL (read, write, approve)
 */
export function checkCaseAccess(requiredLevel = ACCESS_LEVEL.READ) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new ApiError(401, "Unauthorized: Authentication required"));
            }

            const caseId = req.params.case_id || req.params.caseId || req.body.caseId || req.query.caseId;
            if (!caseId) {
                return next(new ApiError(400, "Missing required case identifier"));
            }

            const caseObj = await CaseModel.findById(caseId);
            if (!caseObj) {
                return next(new ApiError(404, `Case with ID '${caseId}' not found.`));
            }

            // Admins and Registrars have administrative oversight across all cases
            if (AccessControl.isAdminOrRegistrar(req.user.role)) {
                req.case = caseObj;
                return next();
            }

            // Case creator has full access
            if (caseObj.created_by === req.user.id) {
                req.case = caseObj;
                return next();
            }

            // Explicit case_access grant check (including expiry verification)
            const hasExplicitAccess = await CaseAccessModel.hasAccess(req.user.id, caseId, requiredLevel);
            if (!hasExplicitAccess) {
                return next(
                    new ApiError(
                        403,
                        `Access denied: You do not have '${requiredLevel}' permissions for Case ${caseObj.case_number}. Contact the case administrator or registrar.`
                    )
                );
            }

            req.case = caseObj;
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware factory to enforce Document-Level Access (Point 3 of Four-Point Check).
 * 1. Checks document sensitivity against user security clearance (FR12 / Security Architecture).
 * 2. Checks case-level permission for the parent case.
 * 
 * @param {string} requiredLevel - One of ACCESS_LEVEL
 */
export function checkDocumentAccess(requiredLevel = ACCESS_LEVEL.READ) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new ApiError(401, "Unauthorized: Authentication required"));
            }

            const documentId = req.params.document_id || req.params.documentId || req.body.documentId || req.query.documentId;
            if (!documentId) {
                return next(new ApiError(400, "Missing required document identifier"));
            }

            const document = await DocumentModel.findById(documentId);
            if (!document) {
                return next(new ApiError(404, `Document with ID '${documentId}' not found.`));
            }

            // 1. Clearance vs Sensitivity Check
            const hasClearance = AccessControl.hasClearance(req.user.role, document.sensitivity);
            if (!hasClearance) {
                return next(
                    new ApiError(
                        403,
                        `Clearance Violation: Role '${req.user.role}' lacks clearance for sensitivity level '${document.sensitivity}'.`
                    )
                );
            }

            // 2. Case Access Check
            const caseObj = await CaseModel.findById(document.case_id);
            if (!caseObj) {
                return next(new ApiError(404, "Parent case for this document does not exist."));
            }

            if (!AccessControl.isAdminOrRegistrar(req.user.role) && caseObj.created_by !== req.user.id) {
                const hasCaseAccess = await CaseAccessModel.hasAccess(req.user.id, document.case_id, requiredLevel);
                if (!hasCaseAccess) {
                    return next(
                        new ApiError(
                            403,
                            `Access denied: No active '${requiredLevel}' access for parent case ${caseObj.case_number}.`
                        )
                    );
                }
            }

            req.document = document;
            req.case = caseObj;
            next();
        } catch (error) {
            next(error);
        }
    };
}
