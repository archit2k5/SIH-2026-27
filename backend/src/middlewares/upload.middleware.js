import multer from "multer";
import { ApiError } from "../utils/api-error.js";

// Memory storage keeps file buffers accessible for SHA-256 calculation and pipeline processing
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Allowed MIME types for legal/case documents and evidence scans
    const allowedMimeTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/tiff",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new ApiError(
                400,
                `Invalid file format: '${file.mimetype}'. Supported formats are PDF, PNG, JPEG, WEBP, TIFF, TXT, DOCX.`
            ),
            false
        );
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 30 * 1024 * 1024, // 30 MB max
        files: 1,
    },
});

export const uploadSingleDocument = upload.single("file");
