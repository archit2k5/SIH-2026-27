import { app } from "./app.js";
import { ENV } from "./config/env.js";
import { initDb, pool } from "./config/db.js";
import { Logger } from "./utils/logger.js";

async function startServer() {
    try {
        Logger.info("Starting SIH Document Management System Backend...");

        // Verify DB connectivity & initialize schema
        try {
            await pool.query("SELECT 1");
            Logger.info("Connected to PostgreSQL database successfully.");
            await initDb();
        } catch (dbError) {
            Logger.warn(
                "PostgreSQL database connection failed. Server will continue running, but DB-dependent routes will require a running PostgreSQL instance.",
                { error: dbError.message }
            );
        }

        const server = app.listen(ENV.PORT, () => {
            Logger.info(`Server is listening on http://localhost:${ENV.PORT}`);
            Logger.info(`Environment: ${ENV.NODE_ENV}`);
            Logger.info(`Health check available at http://localhost:${ENV.PORT}/api/v1/health`);
        });

        // Graceful shutdown handling
        const shutdown = async () => {
            Logger.info("Received termination signal. Closing server and database pool...");
            server.close(async () => {
                await pool.end();
                Logger.info("Server and database pool closed cleanly.");
                process.exit(0);
            });
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

    } catch (error) {
        Logger.error("Failed to start server", error);
        process.exit(1);
    }
}

startServer();
