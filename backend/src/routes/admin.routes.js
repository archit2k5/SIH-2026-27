import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/role.middleware.js";

const router = Router();

// All admin endpoints require authentication + Admin role
router.use(authenticate, requireAdmin);

router.get("/users", AdminController.listUsers);
router.post("/users", AdminController.createUser);
router.post("/users/:user_id/role", AdminController.updateUserRole);
router.get("/system-health", AdminController.getSystemHealth);

export default router;
