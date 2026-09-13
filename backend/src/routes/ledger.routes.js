import { Router } from "express";
import { LedgerController } from "../controllers/ledger.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkCaseAccess, checkDocumentAccess } from "../middlewares/case-access.middleware.js";
import { requireAdmin } from "../middlewares/role.middleware.js";
import { ACCESS_LEVEL } from "../utils/constants.js";

const router = Router();

router.use(authenticate);

// Document specific ledger trail
router.get(
    "/documents/:document_id/ledger",
    checkDocumentAccess(ACCESS_LEVEL.READ),
    LedgerController.getDocumentLedger
);

// Cryptographic hash-chain integrity verification (FR14)
router.get("/ledger/verify-chain", LedgerController.verifyChainIntegrity);

// Court / Compliance Case Audit Report (FR15)
router.get(
    "/cases/:case_id/audit-report",
    checkCaseAccess(ACCESS_LEVEL.READ),
    LedgerController.getCaseAuditReport
);

// Live Tamper Simulation Endpoint for Hackathon Evaluation Demo
router.post("/ledger/simulate-tamper", requireAdmin, LedgerController.simulateTamper);

export default router;
