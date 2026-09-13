import { Router } from "express";
import { AIController } from "../controllers/ai.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkCaseAccess, checkDocumentAccess } from "../middlewares/case-access.middleware.js";
import { ACCESS_LEVEL } from "../utils/constants.js";

const router = Router();

router.use(authenticate);

// Access-filtered RAG Query with source citations (FR16, FR17, FR20)
router.post("/query", AIController.queryAI);

// Summarize a verified document
router.post(
    "/summarize/:document_id",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    AIController.summarizeDocument
);

// Generate structured case timeline (FR18)
router.post(
    "/timeline/:case_id",
    checkCaseAccess(ACCESS_LEVEL.READ),
    AIController.generateTimeline
);

// AI query audit logs (FR21)
router.get("/query-log", AIController.getQueryLogs);

export default router;
