import dotenv from "dotenv";
dotenv.config();

export const ENV = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || "development",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_PORT: parseInt(process.env.DB_PORT || "5432", 10),
    DB_USER: process.env.DB_USER || "postgres",
    DB_PASSWORD: process.env.DB_PASSWORD || "postgres",
    DB_NAME: process.env.DB_NAME || "sih_dms",

    // Authentication & JWT
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "sih_dms_access_default_secret_key_2026",
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || "1d",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "sih_dms_refresh_default_secret_key_2026",
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || "10d",
    JWT_MFA_SECRET: process.env.JWT_MFA_SECRET || "sih_dms_mfa_default_secret_key_2026",
    JWT_MFA_EXPIRY: process.env.JWT_MFA_EXPIRY || "10m",
    SHARE_TOKEN_SECRET: process.env.SHARE_TOKEN_SECRET || "sih_dms_share_default_secret_key_2026",

    // Storage
    STORAGE_TYPE: process.env.STORAGE_TYPE || "local",
    UPLOAD_DIR: process.env.UPLOAD_DIR || "./uploads",
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || "localhost",
    MINIO_PORT: parseInt(process.env.MINIO_PORT || "9000", 10),
    MINIO_USE_SSL: process.env.MINIO_USE_SSL === "true",
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || "minioadmin",
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || "minioadmin",
    MINIO_BUCKET: process.env.MINIO_BUCKET || "case-documents",

    // Email
    MAIL_PRODUCT_NAME: process.env.MAIL_PRODUCT_NAME || "Secure DMS",
    MAIL_PRODUCT_URL: process.env.MAIL_PRODUCT_URL || "http://localhost:5173",
    SMTP_FROM: process.env.SMTP_FROM || "noreply@securedms.gov.in",
    SMTP_SECURE: process.env.SMTP_SECURE === "true",
    SMTP_PORT: parseInt(process.env.SMTP_PORT || process.env.SMTP_MAILTRAP_PORT || "2525", 10),
    SMTP_MAILTRAP_HOST: process.env.SMTP_MAILTRAP_HOST,
    SMTP_MAILTRAP_PORT: process.env.SMTP_MAILTRAP_PORT,
    SMTP_MAILTRAP_USERNAME: process.env.SMTP_MAILTRAP_USERNAME,
    SMTP_MAILTRAP_PASSWORD: process.env.SMTP_MAILTRAP_PASSWORD,
};
