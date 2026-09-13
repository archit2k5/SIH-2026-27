import { CommentModel } from "../models/comment.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { CaseModel } from "../models/case.model.js";
import { CaseAccessModel } from "../models/case-access.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export class CollaborationController {
    /**
     * Add an annotation or comment to a document (FR22)
     * POST /api/v1/documents/:document_id/comments
     */
    static addComment = asyncHandler(async (req, res) => {
        const documentId = req.params.document_id;
        const { content } = req.body;

        if (!content || content.trim() === "") {
            throw new ApiError(400, "Comment content cannot be empty.");
        }

        const comment = await CommentModel.create({
            documentId,
            userId: req.user.id,
            content: content.trim(),
        });

        // Notify other case participants about the annotation
        if (req.document?.case_id) {
            const members = await CaseAccessModel.listAccessForCase(req.document.case_id);
            for (const member of members) {
                if (member.user_id !== req.user.id) {
                    await NotificationModel.create({
                        userId: member.user_id,
                        caseId: req.document.case_id,
                        title: `New Note on ${req.document.title}`,
                        message: `${req.user.name} (${req.user.role}) added an annotation: "${content.slice(0, 80)}..."`,
                    });
                }
            }
        }

        return res.status(201).json(
            new ApiResponse(201, { comment }, "Comment added successfully.")
        );
    });

    /**
     * List all comments/annotations for a document
     * GET /api/v1/documents/:document_id/comments
     */
    static listComments = asyncHandler(async (req, res) => {
        const documentId = req.params.document_id;
        const comments = await CommentModel.listByDocument(documentId);

        return res.status(200).json(
            new ApiResponse(200, { comments, total: comments.length }, "Comments retrieved.")
        );
    });

    /**
     * Get recent case activity feed (FR23)
     * GET /api/v1/cases/:case_id/notifications
     */
    static getCaseNotifications = asyncHandler(async (req, res) => {
        const caseId = req.params.case_id;
        // In Notifications table, retrieve recent alerts for this case
        const notifs = await NotificationModel.listForUser(req.user.id);
        const caseNotifs = notifs.filter(n => n.case_id === caseId);

        return res.status(200).json(
            new ApiResponse(200, { notifications: caseNotifs }, "Case notifications retrieved.")
        );
    });

    /**
     * Get user's notifications feed
     * GET /api/v1/notifications
     */
    static getUserNotifications = asyncHandler(async (req, res) => {
        const unreadOnly = req.query.unread === "true";
        const notifications = await NotificationModel.listForUser(req.user.id, unreadOnly);

        return res.status(200).json(
            new ApiResponse(200, { notifications, total: notifications.length }, "Notifications retrieved.")
        );
    });

    /**
     * Mark notification as read
     * PATCH /api/v1/notifications/:id/read
     */
    static markNotificationRead = asyncHandler(async (req, res) => {
        const notificationId = req.params.id;
        const updated = await NotificationModel.markAsRead(notificationId, req.user.id);

        if (!updated) {
            throw new ApiError(404, "Notification not found.");
        }

        return res.status(200).json(
            new ApiResponse(200, { notification: updated }, "Notification marked as read.")
        );
    });
}
