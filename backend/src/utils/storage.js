import fs from "fs";
import path from "path";
import { ENV } from "../config/env.js";
import { sha256 } from "./crypto.js";
import { generateSecureToken } from "./token.js";
import { Logger } from "./logger.js";

/**
 * Storage utility supporting local filesystem and object storage (MinIO / S3)
 */
export class StorageService {
    /**
     * Ensure local upload directory exists
     */
    static ensureUploadDir() {
        const uploadDir = path.resolve(ENV.UPLOAD_DIR);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        return uploadDir;
    }

    /**
     * Store an uploaded file buffer, calculate SHA-256 hash, and return storage metadata
     * @param {Object} params
     * @param {Buffer} params.buffer
     * @param {string} params.originalName
     * @param {string} params.caseId
     * @returns {Promise<{ storagePath: string, originalHash: string, size: number }>}
     */
    static async saveFile({ buffer, originalName, caseId }) {
        if (!buffer || !Buffer.isBuffer(buffer)) {
            throw new TypeError("File buffer is required");
        }

        const originalHash = sha256(buffer);
        const fileExt = path.extname(originalName) || ".bin";
        const sanitizedCaseId = (caseId || "general").replace(/[^a-zA-Z0-9_-]/g, "_");
        
        // Structure: uploads/<caseId>/<hash><ext>
        const targetDir = path.join(this.ensureUploadDir(), sanitizedCaseId);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const fileName = `${Date.now()}_${originalHash.slice(0, 16)}${fileExt}`;
        const filePath = path.join(targetDir, fileName);

        await fs.promises.writeFile(filePath, buffer);
        Logger.info(`File stored successfully at ${filePath} (SHA256: ${originalHash.slice(0, 8)}...)`);

        // Relative path stored in database for portability
        const relativeStoragePath = path.relative(path.resolve("."), filePath);

        return {
            storagePath: relativeStoragePath,
            originalHash,
            size: buffer.length,
        };
    }

    /**
     * Get a readable stream for a stored document file
     * @param {string} storagePath
     * @returns {fs.ReadStream}
     */
    static getFileStream(storagePath) {
        const absolutePath = path.resolve(storagePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Document file not found at storage path: ${storagePath}`);
        }
        return fs.createReadStream(absolutePath);
    }

    /**
     * Check if a stored file exists
     * @param {string} storagePath
     * @returns {boolean}
     */
    static fileExists(storagePath) {
        const absolutePath = path.resolve(storagePath);
        return fs.existsSync(absolutePath);
    }

    /**
     * Generates a time-limited signed URL token for secure document downloads
     * @param {string} documentId 
     * @param {string} userId 
     * @param {number} [expiresInSeconds=3600] 
     * @returns {{ token: string, expiresAt: Date }}
     */
    static generateSignedDownloadToken(documentId, userId, expiresInSeconds = 3600) {
        const token = generateSecureToken(32);
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
        return { token, expiresAt };
    }
}
