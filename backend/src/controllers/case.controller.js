import { CaseModel } from "../models/case.model.js";
import { CaseAccessModel } from "../models/case-access.model.js";
import { UserModel } from "../models/user.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AccessControl } from "../utils/access-control.js";
import { ACCESS_LEVEL, CASE_STATUS } from "../utils/constants.js";

export class CaseController {
    /**
     * List cases accessible to current user (Admin sees all, others see assigned)
     * GET /api/v1/cases
     */
    static listCases = asyncHandler(async (req, res) => {
        const isAdminOrRegistrar = AccessControl.isAdminOrRegistrar(req.user.role);
        const cases = await CaseModel.listForUser(req.user.id, isAdminOrRegistrar);

        return res.status(200).json(
            new ApiResponse(200, { cases, total: cases.length }, "Cases retrieved successfully.")
        );
    });

    /**
     * Create a new case
     * POST /api/v1/cases
     */
    static createCase = asyncHandler(async (req, res) => {
        const { caseNumber, title, description, status } = req.body;

        if (!caseNumber || !title) {
            throw new ApiError(400, "Case number and title are required.");
        }

        const existing = await CaseModel.findByCaseNumber(caseNumber);
        if (existing) {
            throw new ApiError(409, `Case with number '${caseNumber}' already exists.`);
        }

        const newCase = await CaseModel.create({
            caseNumber,
            title,
            description: description || "",
            status: status || CASE_STATUS.OPEN,
            createdBy: req.user.id,
        });

        // Automatically grant 'approve' access to the creator
        await CaseAccessModel.grantAccess({
            caseId: newCase.id,
            userId: req.user.id,
            accessLevel: ACCESS_LEVEL.APPROVE,
            grantedBy: req.user.id,
        });

        return res.status(201).json(
            new ApiResponse(201, { case: newCase }, `Case ${caseNumber} created successfully.`)
        );
    });

    /**
     * Get case details by ID
     * GET /api/v1/cases/:case_id
     */
    static getCaseById = asyncHandler(async (req, res) => {
        const caseId = req.params.case_id;
        const caseDetails = await CaseModel.findById(caseId);

        if (!caseDetails) {
            throw new ApiError(404, "Case not found.");
        }

        const accessGrants = await CaseAccessModel.listAccessForCase(caseId);

        return res.status(200).json(
            new ApiResponse(
                200,
                { case: caseDetails, assignedMembers: accessGrants },
                "Case details retrieved successfully."
            )
        );
    });

    /**
     * Grant or update access to a case (time-bound optional)
     * POST /api/v1/cases/:case_id/access
     */
    static grantAccess = asyncHandler(async (req, res) => {
        const caseId = req.params.case_id;
        const { userId, accessLevel, expiresAt } = req.body;

        if (!userId || !accessLevel) {
            throw new ApiError(400, "User ID and access level are required.");
        }

        const targetUser = await UserModel.findById(userId);
        if (!targetUser) {
            throw new ApiError(404, "Target user not found.");
        }

        const grant = await CaseAccessModel.grantAccess({
            caseId,
            userId,
            accessLevel,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            grantedBy: req.user.id,
        });

        const caseObj = await CaseModel.findById(caseId);

        // Notify user about granted case access
        await NotificationModel.create({
            userId,
            caseId,
            title: `Access Granted to Case ${caseObj?.case_number || ""}`,
            message: `You have been granted '${accessLevel}' access to case '${caseObj?.title}'. Expires: ${expiresAt ? new Date(expiresAt).toLocaleDateString() : "Never"}`,
        });

        return res.status(200).json(
            new ApiResponse(200, { grant }, `Granted '${accessLevel}' access to ${targetUser.name}.`)
        );
    });

    /**
     * Revoke access to a case
     * DELETE /api/v1/cases/:case_id/access/:user_id
     */
    static revokeAccess = asyncHandler(async (req, res) => {
        const { case_id: caseId, user_id: userId } = req.params;

        const revoked = await CaseAccessModel.revokeAccess(caseId, userId);
        if (!revoked) {
            throw new ApiError(404, "No access record found for this user in the specified case.");
        }

        return res.status(200).json(
            new ApiResponse(200, { revoked }, "Case access revoked successfully.")
        );
    });

    /**
     * List access grants for a case
     * GET /api/v1/cases/:case_id/access
     */
    static listCaseAccess = asyncHandler(async (req, res) => {
        const caseId = req.params.case_id;
        const accessList = await CaseAccessModel.listAccessForCase(caseId);

        return res.status(200).json(
            new ApiResponse(200, { accessList }, "Case access list retrieved successfully.")
        );
    });
}
