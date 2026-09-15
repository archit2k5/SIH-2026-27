import { DocumentModel } from "../models/document.model.js";
import { DocumentVersionModel } from "../models/document-version.model.js";
import { ExtractedFieldModel } from "../models/extracted-field.model.js";
import { LedgerModel } from "../models/ledger.model.js";
import { DocumentShareModel } from "../models/document-share.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { CaseAccessModel } from "../models/case-access.model.js";
import { CaseModel } from "../models/case.model.js";
import { StorageService } from "../utils/storage.js";
import { PipelineService } from "../services/pipeline.service.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AccessControl } from "../utils/access-control.js";
import { generateSecureToken } from "../utils/token.js";
import { signData, generateKeyPair } from "../utils/crypto.js";
import { DOC_TYPE, LEDGER_ACTION, SENSITIVITY_LEVEL } from "../utils/constants.js";
import { Logger } from "../utils/logger.js";

export class DocumentController {
    /**
     * Upload a new document to a case (Multipart)
     * POST /api/v1/cases/:case_id/documents
     */
    static uploadDocument = asyncHandler(async (req, res) => {
        const caseId = req.params.case_id;
        const file = req.file;

        if (!file) {
            throw new ApiError(400, "Document file is required.");
        }

        const { title, docType, sensitivity, language, initialText } = req.body;

        // 1. Duplicate detection check (FR4)
        const { isDuplicate, existingDocument, hash } = await PipelineService.checkDuplicate(file.buffer);
        if (isDuplicate) {
            throw new ApiError(
                409,
                `Duplicate document detected: Identical file hash (${hash.slice(0, 16)}...) already uploaded in case '${existingDocument.case_number}' as '${existingDocument.title}'.`
            );
        }

        // 2. Store file securely
        const { storagePath, originalHash } = await StorageService.saveFile({
            buffer: file.buffer,
            originalName: file.originalname,
            caseId,
        });

        // 3. Create document record in database
        const document = await DocumentModel.create({
            caseId,
            docType: docType || DOC_TYPE.OTHER,
            title: title || file.originalname,
            storagePath,
            originalHash,
            language: language || "en",
            verified: false, // Human verification gate (FR5)
            uploadedBy: req.user.id,
        });

        // Update sensitivity if provided
        if (sensitivity) {
            await DocumentModel.updateSensitivity(document.id, sensitivity);
            document.sensitivity = sensitivity;
        }

        // 4. Create Version 1 record
        await DocumentVersionModel.createVersion({
            documentId: document.id,
            versionNumber: 1,
            storagePath,
            hash: originalHash,
            createdBy: req.user.id,
            changeSummary: "Initial ingestion upload",
        });

        // 5. Append UPLOAD action to hash-chain ledger (FR13)
        const uploadLedger = await LedgerModel.appendEntry({
            documentId: document.id,
            action: LEDGER_ACTION.UPLOAD,
            actorId: req.user.id,
            documentHash: originalHash,
            metadata: {
                originalFilename: file.originalname,
                fileSize: file.size,
                mimetype: file.mimetype,
            },
        });

        // 6. Trigger automated pipeline: Translation & NER Extraction (FR2, FR3)
        const pipelineResult = await PipelineService.processIngestion({
            documentId: document.id,
            buffer: file.buffer,
            filename: file.originalname,
            storagePath,
            initialText: initialText || "",
        });

        // 7. Append TRANSLATE and EXTRACT ledger entries
        await LedgerModel.appendEntry({
            documentId: document.id,
            action: LEDGER_ACTION.TRANSLATE,
            actorId: req.user.id,
            documentHash: originalHash,
            metadata: {
                detectedLanguage: pipelineResult.language,
            },
        });

        await LedgerModel.appendEntry({
            documentId: document.id,
            action: LEDGER_ACTION.EXTRACT,
            actorId: req.user.id,
            documentHash: originalHash,
            metadata: {
                extractedEntitiesCount: pipelineResult.entities.length,
            },
        });

        // 8. Notify assigned case members (FR23)
        const caseObj = await CaseModel.findById(caseId);
        const members = await CaseAccessModel.listAccessForCase(caseId);
        for (const member of members) {
            if (member.user_id !== req.user.id) {
                await NotificationModel.create({
                    userId: member.user_id,
                    caseId,
                    title: `New Document Uploaded: ${document.title}`,
                    message: `Officer ${req.user.name} uploaded '${document.title}' (${document.doc_type}) to case ${caseObj?.case_number}. Verification required.`,
                });
            }
        }

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    document,
                    extractedFields: pipelineResult.entities,
                    detectedLanguage: pipelineResult.language,
                    ledgerEntry: uploadLedger,
                },
                "Document uploaded and processed successfully. Pending human verification."
            )
        );
    });

    /**
     * List documents in a case filtered by user clearance
     * GET /api/v1/cases/:case_id/documents
     */
    static listCaseDocuments = asyncHandler(async (req, res) => {
        const caseId = req.params.case_id;
        const onlyVerified = req.query.verified === "true";

        const docs = await DocumentModel.listByCase(caseId, onlyVerified);

        // Filter documents according to user's security clearance rank (Point 3 check)
        const filteredDocs = docs.filter(doc =>
            AccessControl.hasClearance(req.user.role, doc.sensitivity || SENSITIVITY_LEVEL.PUBLIC)
        );

        return res.status(200).json(
            new ApiResponse(200, { documents: filteredDocs, total: filteredDocs.length }, "Case documents retrieved.")
        );
    });

    /**
     * Get document metadata and status
     * GET /api/v1/documents/:document_id
     */
    static getDocumentById = asyncHandler(async (req, res) => {
        const document = req.document; // populated by checkDocumentAccess middleware
        const versions = await DocumentVersionModel.getVersionsByDocumentId(document.id);
        const extractedFields = await ExtractedFieldModel.getByDocumentId(document.id);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    document,
                    currentVersion: versions[0] || null,
                    extractedFields,
                },
                "Document retrieved successfully."
            )
        );
    });

    /**
     * Get version history of a document
     * GET /api/v1/documents/:document_id/versions
     */
    static getDocumentVersions = asyncHandler(async (req, res) => {
        const versions = await DocumentVersionModel.getVersionsByDocumentId(req.document.id);
        return res.status(200).json(new ApiResponse(200, { versions }, "Document versions retrieved."));
    });

    /**
     * Download or stream original/version file
     * GET /api/v1/documents/:document_id/file
     */
    static downloadFile = asyncHandler(async (req, res) => {
        const document = req.document;
        const versionNumber = req.query.version;

        let targetStoragePath = document.storage_path;
        if (versionNumber) {
            const specificVersion = await DocumentVersionModel.getSpecificVersion(document.id, parseInt(versionNumber, 10));
            if (specificVersion) {
                targetStoragePath = specificVersion.storage_path;
            }
        }

        let fileBuffer;

        try {
            fileBuffer = await StorageService.getFileBuffer(targetStoragePath);
        } catch (error) {
            Logger.error(
                `Failed to retrieve document ${document.id} from MinIO: ${error.message}`
            );

            throw new ApiError(
                404,
                "Physical document file not found in storage."
            );
        }

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(document.title)}"`
        );

        res.setHeader(
            "Content-Type",
            document.mime_type || "application/octet-stream"
        );

        res.setHeader("Content-Length", fileBuffer.length);

        return res.send(fileBuffer);
    });

    /**
     * Get translated version
     * GET /api/v1/documents/:document_id/translation
     */
    static getTranslation = asyncHandler(async (req, res) => {
        const document = req.document;
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    documentId: document.id,
                    sourceLanguage: document.language,
                    translationStatus: "available",
                    note: "Original document remains the legally authoritative copy under IT Act 2000.",
                },
                "Document translation information retrieved."
            )
        );
    });

    /**
     * Get NER extracted fields
     * GET /api/v1/documents/:document_id/extracted-fields
     */
    static getExtractedFields = asyncHandler(async (req, res) => {
        const fields = await ExtractedFieldModel.getByDocumentId(req.document.id);
        return res.status(200).json(
            new ApiResponse(200, { fields, isVerified: req.document.verified }, "Extracted fields retrieved.")
        );
    });

    /**
     * Human Verification Gate (FR5, FR6, FR7)
     * Officer confirms/edits extracted fields -> signs with digital signature -> unlocks for RAG
     * POST /api/v1/documents/:document_id/verify
     */
    static verifyDocument = asyncHandler(async (req, res) => {
        const document = req.document;
        const userId = req.user.id;

        // 1. Verify the document
        const verifiedDocument =
            await DocumentModel.setVerifiedStatus(
                document.id,
                true
            );

        if (!verifiedDocument) {
            throw new ApiError(
                404,
                "Document not found."
            );
        }

        // 2. Mark extracted NER fields as verified
        await ExtractedFieldModel.verifyFields(
            document.id,
            userId
        );

        // 3. Index the actual extracted document text for RAG
        const chunks = await PipelineService.indexForRAG(
            document.id
        );

        // 4. Record verification in the tamper-evident ledger
        await LedgerModel.appendEntry({
            documentId: document.id,
            action: "VERIFY",
            actorId: userId,
            documentHash: document.original_hash,
            metadata: {
                chunksIndexed: chunks.length,
                verificationType: "human",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Document verified and indexed successfully.",
            data: {
                document: verifiedDocument,
                chunksIndexed: chunks.length,
            },
        });
    });

    /**
     * Create a time-limited watermarked share link (FR24)
     * POST /api/v1/documents/:document_id/share
     */
    static createShareLink = asyncHandler(async (req, res) => {
        const document = req.document;
        const { durationHours = 24, watermarkText } = req.body;

        const shareToken = generateSecureToken(32);
        const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000);

        const shareRecord = await DocumentShareModel.create({
            documentId: document.id,
            shareToken,
            expiresAt,
            createdBy: req.user.id,
            watermarkText: watermarkText || `RESTRICTED — VIEWED BY EXTERNAL COUNSEL — ${new Date().toISOString().split("T")[0]}`,
        });

        // Log SHARE action in ledger
        await LedgerModel.appendEntry({
            documentId: document.id,
            action: LEDGER_ACTION.SHARE,
            actorId: req.user.id,
            documentHash: document.original_hash,
            metadata: {
                shareToken: shareToken.slice(0, 8) + "...",
                expiresAt,
            },
        });

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    shareRecord,
                    shareUrl: `/api/v1/documents/shared/${shareToken}`,
                    expiresAt,
                },
                "Time-limited secure watermarked share link created."
            )
        );
    });

    /**
     * View shared document via token (External / Defense Counsel)
     * GET /api/v1/documents/shared/:share_token
     */
    static getSharedDocument = asyncHandler(async (req, res) => {
        const { share_token: shareToken } = req.params;

        const share = await DocumentShareModel.findValidByToken(shareToken);
        if (!share) {
            throw new ApiError(403, "This share link has expired, reached its access limit, or is invalid.");
        }

        await DocumentShareModel.incrementAccessCount(shareToken);

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    document: {
                        id: share.document_id,
                        title: share.document_title,
                        docType: share.doc_type,
                        verified: share.verified,
                    },
                    watermark: share.watermark_text,
                    expiresAt: share.expires_at,
                    accessCount: (share.access_count || 0) + 1,
                },
                "Shared document accessible under read-only watermarked policy."
            )
        );
    });
}
