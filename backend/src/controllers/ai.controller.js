import { AIService } from "../services/ai.service.js";
import { AIQueryLogModel } from "../models/ai-query-log.model.js";
import { DocumentModel } from "../models/document.model.js";
import { ExtractedFieldModel } from "../models/extracted-field.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export class AIController {
    /**
     * Submit natural-language question with access-filtered RAG retrieval & mandatory citations (FR16, FR17, FR20)
     * POST /api/v1/ai/query
     */
    static queryAI = asyncHandler(async (req, res) => {
        const { query: queryText, caseId } = req.body;

        if (!queryText || queryText.trim() === "") {
            throw new ApiError(400, "Query text is required.");
        }

        const result = await AIService.queryAssistant({
            userId: req.user.id,
            userRole: req.user.role,
            caseId: caseId || null,
            queryText: queryText.trim(),
        });

        return res.status(200).json(
            new ApiResponse(200, result, "AI query executed successfully with source citations.")
        );
    });

    /**
     * Summarize a single verified document (FR19)
     * POST /api/v1/ai/summarize/:document_id
     */
    static summarizeDocument = asyncHandler(async (req, res) => {
        const documentId = req.params.document_id;
        const document = req.document || (await DocumentModel.findById(documentId));

        if (!document) {
            throw new ApiError(404, "Document not found.");
        }

        const fields = await ExtractedFieldModel.getByDocumentId(document.id);

        const summaryResult = await AIService.summarizeDocument({
            document,
            extractedFields: fields,
            userId: req.user.id,
        });

        return res.status(200).json(
            new ApiResponse(200, summaryResult, "Document summary generated.")
        );
    });

    /**
     * Generate structured chronological case timeline (FR18)
     * POST /api/v1/ai/timeline/:case_id
     */
    static generateTimeline = asyncHandler(async (req, res) => {
        const caseId = req.params.case_id;

        const timelineResult = await AIService.generateCaseTimeline(caseId, req.user.id);

        return res.status(200).json(
            new ApiResponse(200, timelineResult, "Structured case timeline generated.")
        );
    });

    /**
     * Retrieve past AI queries audit logs (FR21)
     * GET /api/v1/ai/query-log
     */
    static getQueryLogs = asyncHandler(async (req, res) => {
        const caseId = req.query.caseId;

        let logs = [];
        if (caseId) {
            logs = await AIQueryLogModel.listByCase(caseId);
        } else {
            logs = await AIQueryLogModel.listByUser(req.user.id);
        }

        return res.status(200).json(
            new ApiResponse(200, { logs, count: logs.length }, "AI query logs retrieved.")
        );
    });
}
