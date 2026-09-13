import { Router } from "express";
import { DocumentController } from "../controllers/document.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkCaseAccess, checkDocumentAccess } from "../middlewares/case-access.middleware.js";
import { requireVerificationClearance } from "../middlewares/role.middleware.js";
import { uploadSingleDocument } from "../middlewares/upload.middleware.js";
import { ACCESS_LEVEL } from "../utils/constants.js";

const router = Router();

// Public time-limited watermarked share retrieval (FR24)
router.get("/documents/shared/:share_token", DocumentController.getSharedDocument);

// Protected routes below
router.use(authenticate);

// Case-level document endpoints
router.post(
    "/cases/:case_id/documents",
    checkCaseAccess(ACCESS_LEVEL.WRITE),
    uploadSingleDocument,
    DocumentController.uploadDocument
);

router.get(
    "/cases/:case_id/documents",
    checkCaseAccess(ACCESS_LEVEL.READ),
    DocumentController.listCaseDocuments
);

// Specific Document endpoints
router.get(
    "/documents/:document_id",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    DocumentController.getDocumentById
);

router.get(
    "/documents/:document_id/versions",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    DocumentController.getDocumentVersions
);

router.get(
    "/documents/:document_id/file",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    DocumentController.downloadFile
);

router.get(
    "/documents/:document_id/translation",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    DocumentController.getTranslation
);

router.get(
    "/documents/:document_id/extracted-fields",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    DocumentController.getExtractedFields
);

// Mandatory Human Verification gate with digital signature (FR5, FR6, FR7)
router.post(
    "/documents/:document_id/verify",
    requireVerificationClearance,
    checkDocumentAccess(ACCESS_LEVEL.APPROVE),
    DocumentController.verifyDocument
);

// Create time-limited watermarked share link (FR24)
router.post(
    "/documents/:document_id/share",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    DocumentController.createShareLink
);

export default router;
