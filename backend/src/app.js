import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV } from "./config/env.js";
import { ApiResponse } from "./utils/api-response.js";
import { ApiError } from "./utils/api-error.js";
import { apiRouter } from "./routes/index.js";

const app = express();

// Global Middlewares
app.use(
    cors({
        origin: ENV.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: "16mb" }));
app.use(express.urlencoded({ extended: true, limit: "16mb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Base Health Check Endpoint
app.get("/api/v1/health", (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                status: "healthy",
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                environment: ENV.NODE_ENV,
            },
            "SIH Document Management System API is running smoothly."
        )
    );
});

// Mount All API v1 Routes
app.use("/api/v1", apiRouter);


// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Something went wrong on the server";
        error = new ApiError(statusCode, message, error?.errors || [], err.stack);
    }

    const response = {
        success: false,
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors,
        ...(ENV.NODE_ENV === "development" ? { stack: error.stack } : {}),
    };

    return res.status(error.statusCode).json(response);
});

export { app };
