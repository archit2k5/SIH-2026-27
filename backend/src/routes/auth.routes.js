import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Authentication Endpoints
router.post("/login", AuthController.login);
router.post("/mfa/verify", AuthController.verifyMfa);

// Protected Authentication Endpoints
router.post("/mfa/setup", authenticate, AuthController.setupMfa);
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, AuthController.getMe);

export default router;
