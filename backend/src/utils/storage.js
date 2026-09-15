import path from "path";

import { PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "../config/minio.js";
import { minioClient, MINIO_BUCKET } from "../config/minio.js";
import { ENV } from "../config/env.js";
import { sha256 } from "./crypto.js";
import { generateSecureToken } from "./token.js";
import { Logger } from "./logger.js";

export class StorageService {

    /**
     * Store uploaded document in MinIO.
     *
     * Object structure:
     * case-documents/
     *   cases/<caseId>/<timestamp>_<hash><extension>
     */
    static async saveFile({ buffer, originalName, caseId }) {
        if (!buffer || !Buffer.isBuffer(buffer)) {
            throw new TypeError("File buffer is required");
        }

        const originalHash = sha256(buffer);

        const fileExt =
            path.extname(originalName || "").toLowerCase() || ".bin";

        const sanitizedCaseId =
            (caseId || "general").replace(/[^a-zA-Z0-9_-]/g, "_");

        const fileName =
            `${Date.now()}_${originalHash.slice(0, 16)}${fileExt}`;

        const objectKey =
            `cases/${sanitizedCaseId}/${fileName}`;

        await minioClient.send(
            new PutObjectCommand({
                Bucket: MINIO_BUCKET,
                Key: objectKey,
                Body: buffer
            })
        );

        Logger.info(
            `File stored successfully in MinIO at ${objectKey} ` +
            `(SHA256: ${originalHash.slice(0, 8)}...)`
        );

        return {
            storagePath: objectKey,
            originalHash,
            size: buffer.length
        };
    }

    /**
     * Download a document from MinIO.
     */
    static async getFileBuffer(storagePath) {
        const response = await minioClient.send(
            new GetObjectCommand({
                Bucket: MINIO_BUCKET,
                Key: storagePath
            })
        );

        return Buffer.from(
            await response.Body.transformToByteArray()
        );
    }

    /**
     * Check whether an object exists in MinIO.
     */
    static async fileExists(storagePath) {
        try {
            await minioClient.send(
                new HeadObjectCommand({
                    Bucket: MINIO_BUCKET,
                    Key: storagePath
                })
            );

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check MinIO connection and bucket availability.
     */
    static async testConnection() {
        await minioClient.send(
            new HeadBucketCommand({
                Bucket: MINIO_BUCKET
            })
        );

        return true;
    }

    /**
     * Generates a time-limited signed URL token
     * for secure document downloads.
     */
    static generateSignedDownloadToken(
        documentId,
        userId,
        expiresInSeconds = 3600
    ) {
        const token = generateSecureToken(32);

        const expiresAt =
            new Date(Date.now() + expiresInSeconds * 1000);

        return {
            token,
            expiresAt
        };
    }
}