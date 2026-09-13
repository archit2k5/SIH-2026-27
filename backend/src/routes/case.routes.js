import { Router } from "express";
import { CaseController } from "../controllers/case.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { checkCaseAccess } from "../middlewares/case-access.middleware.js";
import { requireAdminOrRegistrar } from "../middlewares/role.middleware.js";
import { ACCESS_LEVEL } from "../utils/constants.js";

const router = Router();

// All case routes require authentication
router.use(authenticate);

// List cases accessible to user
router.get("/", CaseController.listCases);

// Create case (Admin/Registrar or IO)
router.post("/", CaseController.createCase);

// Get case details
router.get("/:case_id", checkCaseAccess(ACCESS_LEVEL.READ), CaseController.getCaseById);

// Grant/update access to a user
router.post("/:case_id/access", checkCaseAccess(ACCESS_LEVEL.APPROVE), CaseController.grantAccess);

// Revoke access
router.delete("/:case_id/access/:user_id", checkCaseAccess(ACCESS_LEVEL.APPROVE), CaseController.revokeAccess);

// List assigned members
router.get("/:case_id/access", checkCaseAccess(ACCESS_LEVEL.READ), CaseController.listCaseAccess);

export default router;
