import {
    minioClient,
    MINIO_BUCKET,
    PutObjectCommand,
    HeadBucketCommand
} from "./minio.js";

const testMinIO = async () => {
    try {
        // 1. Check bucket
        await minioClient.send(
            new HeadBucketCommand({
                Bucket: MINIO_BUCKET
            })
        );

        console.log(`Connected to MinIO bucket: ${MINIO_BUCKET}`);

        // 2. Upload a test object
        const testContent = Buffer.from(
            "Secure DMS MinIO connection test"
        );

        const objectKey = "test/minio-test.txt";

        await minioClient.send(
            new PutObjectCommand({
                Bucket: MINIO_BUCKET,
                Key: objectKey,
                Body: testContent,
                ContentType: "text/plain"
            })
        );

        console.log(`Test file uploaded: ${objectKey}`);
    } catch (error) {
        console.error("MinIO test failed:");
        console.error(error);
        process.exit(1);
    }
};

testMinIO();