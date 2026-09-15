import { UserModel } from "../models/user.model.js";
import { LedgerModel } from "../models/ledger.model.js";
import { pool, query } from "../config/db.js";
import { generateKeyPair } from "../utils/crypto.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { StorageService } from "../utils/storage.js";
import { ALL_ROLES, ROLES } from "../utils/constants.js";
import { ENV } from "../config/env.js";

export class AdminController {
    /**
     * List all registered users (Admin only)
     * GET /api/v1/admin/users
     */
    static listUsers = asyncHandler(async (req, res) => {
        const users = await UserModel.listAll();
        return res.status(200).json(
            new ApiResponse(200, { users, total: users.length }, "All system users retrieved.")
        );
    });

    /**
     * Register a new user with cryptographic keypair (Admin only)
     * POST /api/v1/admin/users
     */
    static createUser = asyncHandler(async (req, res) => {
        const { name, email, password, role, mfaEnabled } = req.body;

        if (!name || !email || !password) {
            throw new ApiError(400, "Name, email, and password are required.");
        }

        const existing = await UserModel.findByEmail(email);
        if (existing) {
            throw new ApiError(409, `User with email '${email}' already exists.`);
        }

        // Generate Ed25519 digital signature keypair for IT Act 2000 compliance
        const { publicKey, privateKey } = generateKeyPair();

        const user = await UserModel.create({
            name,
            email,
            password,
            role: role || ROLES.IO,
            publicKey,
            mfaEnabled: !!mfaEnabled,
        });

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    user,
                    keypair: {
                        publicKey,
                        privateKey, // Sent once upon creation to the officer
                        note: "Store private key securely. It is used for legal non-repudiation digital signatures.",
                    },
                },
                "User account created with cryptographic signing identity."
            )
        );
    });

    /**
     * Change user role (Admin only)
     * POST /api/v1/admin/users/:user_id/role
     */
    static updateUserRole = asyncHandler(async (req, res) => {
        const userId = req.params.user_id;
        const { role } = req.body;

        if (!role || !ALL_ROLES.includes(role)) {
            throw new ApiError(400, `Invalid role: '${role}'. Allowed roles: ${ALL_ROLES.join(", ")}`);
        }

        const updated = await UserModel.updateRole(userId, role);
        if (!updated) {
            throw new ApiError(404, "User not found.");
        }

        return res.status(200).json(
            new ApiResponse(200, { user: updated }, `Role updated to '${role}' for ${updated.name}.`)
        );
    });

    /**
     * System Health & Integrity Monitor
     * GET /api/v1/admin/system-health
     */
    static getSystemHealth = asyncHandler(async (req, res) => {
        // 1. PostgreSQL DB Health
        let dbStatus = "healthy";
        let dbLatencyMs = 0;
        try {
            const start = Date.now();
            await pool.query("SELECT 1");
            dbLatencyMs = Date.now() - start;
        } catch (dbErr) {
            dbStatus = `unhealthy: ${dbErr.message}`;
        }

        // 2. Storage status
        let storageStatus;

        try {
            await StorageService.testConnection();

            storageStatus = {
                type: ENV.STORAGE_TYPE,
                endpoint: `${ENV.MINIO_ENDPOINT}:${ENV.MINIO_PORT}`,
                bucket: ENV.MINIO_BUCKET,
                healthy: true,
            };
        } catch (error) {
            storageStatus = {
                type: ENV.STORAGE_TYPE,
                endpoint: `${ENV.MINIO_ENDPOINT}:${ENV.MINIO_PORT}`,
                bucket: ENV.MINIO_BUCKET,
                healthy: false,
                error: error.message,
            };
        }

        // 3. Cryptographic Ledger verification
        const ledgerCheck = await LedgerModel.verifyLedgerIntegrity();

        // 4. System Counts
        const countCases = await query("SELECT COUNT(*) FROM cases");
        const countDocs = await query("SELECT COUNT(*) FROM documents");
        const countLedger = await query("SELECT COUNT(*) FROM ledger_entries");
        const countUsers = await query("SELECT COUNT(*) FROM users");

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    status: dbStatus === "healthy" && ledgerCheck.valid ? "HEALTHY" : "DEGRADED",
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    database: {
                        status: dbStatus,
                        latencyMs: dbLatencyMs,
                    },
                    storage: storageStatus,
                    ledger: {
                        chainStatus: ledgerCheck.valid ? "VALID" : "TAMPERED",
                        totalEntries: ledgerCheck.totalEntries,
                        tamperDetected: !ledgerCheck.valid,
                    },
                    aiService: {
                        status: "operational",
                        ragIndexCount: (await query("SELECT COUNT(*) FROM document_chunks")).rows[0].count,
                    },
                    statistics: {
                        totalCases: parseInt(countCases.rows[0].count, 10),
                        totalDocuments: parseInt(countDocs.rows[0].count, 10),
                        totalLedgerEntries: parseInt(countLedger.rows[0].count, 10),
                        totalUsers: parseInt(countUsers.rows[0].count, 10),
                    },
                },
                "System health diagnostics completed."
            )
        );
    });
}
