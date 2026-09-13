import { Router } from "express";
import authRoutes from "./auth.routes.js";
import caseRoutes from "./case.routes.js";
import documentRoutes from "./document.routes.js";
import ledgerRoutes from "./ledger.routes.js";
import aiRoutes from "./ai.routes.js";
import collaborationRoutes from "./collaboration.routes.js";
import adminRoutes from "./admin.routes.js";

const apiRouter = Router();

// Mount modules matching architecture endpoints
apiRouter.use("/auth", authRoutes);
apiRouter.use("/cases", caseRoutes);
apiRouter.use("/ai", aiRoutes);
apiRouter.use("/admin", adminRoutes);

// Document, Ledger, and Collaboration routes (which share case/document prefixes)
apiRouter.use("/", documentRoutes);
apiRouter.use("/", ledgerRoutes);
apiRouter.use("/", collaborationRoutes);

export { apiRouter };
