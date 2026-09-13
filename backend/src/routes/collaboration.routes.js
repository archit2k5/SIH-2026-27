import { Router } from "express";
import { CollaborationController } from "../controllers/collaboration.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkCaseAccess, checkDocumentAccess } from "../middlewares/case-access.middleware.js";
import { ACCESS_LEVEL } from "../utils/constants.js";

const router = Router();

router.use(authenticate);

// Document Comments / Annotations (FR22)
router.post(
    "/documents/:document_id/comments",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    CollaborationController.addComment
);

router.get(
    "/documents/:document_id/comments",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    CollaborationController.listComments
);

// Case Notification Feed (FR23)
router.get(
    "/cases/:case_id/notifications",
    checkCaseAccess(ACCESS_LEVEL.READ),
    CollaborationController.getCaseNotifications
);

// User Notifications Feed
router.get("/notifications", CollaborationController.getUserNotifications);
router.patch("/notifications/:id/read", CollaborationController.markNotificationRead);

export default router;
