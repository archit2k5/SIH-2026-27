import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

import { ENV } from "./env.js";

const protocol = ENV.MINIO_USE_SSL ? "https" : "http";

const endpoint = `${protocol}://${ENV.MINIO_ENDPOINT}:${ENV.MINIO_PORT}`;

export const minioClient = new S3Client({
    endpoint,
    region: "us-east-1",
    forcePathStyle: true,

    credentials: {
        accessKeyId: ENV.MINIO_ACCESS_KEY,
        secretAccessKey: ENV.MINIO_SECRET_KEY
    }
});

export { PutObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand };

export const MINIO_BUCKET = ENV.MINIO_BUCKET;