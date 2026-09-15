import { query } from "../config/db.js";
import { AIQueryLogModel } from "../models/ai-query-log.model.js";
import { CaseAccessModel } from "../models/case-access.model.js";
import { AccessControl } from "../utils/access-control.js";
import { AI_CONSTANTS, ROLES } from "../utils/constants.js";
import { Logger } from "../utils/logger.js";
import { PipelineService } from "./pipeline.service.js";
import { LLMService } from "./llm.service.js";

/**
 * Access-Filtered RAG & AI Assistance Service
 * Strictly enforces:
 * 1. FR20: Case-level access filtering before chunks reach the LLM
 * 2. FR5: Only human-verified documents are indexed and retrievable
 * 3. FR16: Mandatory source citation
 * 4. FR17: Deterministic "no supporting document found" when evidence is missing
 * 5. FR18: Structured timeline generation
 * 6. FR19: "AI-assisted — pending human review" disclaimer label
 * 7. FR21: Complete audit logging into ai_query_log
 */
export class AIService {
    /**
     * Retrieve relevant verified document chunks strictly filtered by user's case clearance
     * @param {Object} params
     * @param {string} params.userId
     * @param {string} [params.caseId]
     * @param {string} params.queryText
     * @param {number} [params.limit=5]
     */
    static async retrieveFilteredChunks({ queryText, userId, caseId = null, limit = 5, }) {
        if (!queryText || !queryText.trim()) {
            throw new Error("Query text is required");
        }

        if (!userId) {
            throw new Error("User ID is required");
        }

        const chunks = await PipelineService.searchSimilarChunks({
            queryText,
            userId,
            caseId,
            limit,
        });

        return chunks;
    }

    /**
     * Submit natural language question; returns cited response or "no supporting document found" (FR16, FR17)
     * @param {Object} params
     * @param {string} params.userId
     * @param {string} params.userRole
     * @param {string} [params.caseId]
     * @param {string} params.queryText
     */
    static async queryAssistant({ queryText, userId, caseId = null, limit = 5, }) {
        if (!queryText || !queryText.trim()) {
            throw new Error("Query text is required");
        }

        if (!userId) {
            throw new Error("User ID is required");
        }

        const chunks = await this.retrieveFilteredChunks({
            queryText,
            userId,
            caseId,
            limit,
        });

        // No authorized, verified evidence
        if (!chunks.length) {
            const answer = "No supporting document found.";

            await AIQueryLogModel.logQuery({
                userId,
                caseId,
                queryText,
                retrievedChunkIds: [],
                responseText: answer,
                citations: [],
            });

            return {
                answer,
                citations: [],
                sources: [],
            };
        }

        // Only authorized + verified chunks reach the LLM
        const result = await LLMService.generateGroundedAnswer({
            queryText,
            chunks,
        });

        // Audit the complete AI interaction
        await AIQueryLogModel.logQuery({
            userId,
            caseId,
            queryText,
            retrievedChunkIds: chunks.map(
                (chunk) => chunk.id
            ),
            responseText: result.answer,
            citations: result.citations,
        });

        return {
            answer: result.answer,
            citations: result.citations,
            sources: chunks,
        };
    }

    /**
     * Summarize a single verified document with citations
     * @param {Object} params
     * @param {Object} params.document
     * @param {Array<Object>} params.extractedFields
     * @param {string} params.userId
     */
    static async summarizeDocument({ document, extractedFields = [], userId }) {
        if (!document.verified) {
            return {
                disclaimer: AI_CONSTANTS.DISCLAIMER,
                summary: "This document is pending human verification. Summaries are only generated for verified case documents.",
                isVerified: false,
            };
        }

        const fieldsSummary = extractedFields
            .map(f => `• ${f.field_name}: ${f.field_value}`)
            .join("\n");

        const summary = `Executive Summary for ${document.title} (${document.doc_type}):\n` +
            `Verified on Case records with hash ${document.original_hash.slice(0, 16)}...\n\n` +
            `Key Extracted Entities:\n${fieldsSummary || "No structured entities recorded."}`;

        await AIQueryLogModel.logQuery({
            userId,
            caseId: document.case_id,
            queryText: `Summarize document: ${document.title}`,
            retrievedChunkIds: [],
            responseText: summary,
            citations: [{ documentId: document.id, documentTitle: document.title, docType: document.doc_type }],
        });

        return {
            disclaimer: AI_CONSTANTS.DISCLAIMER,
            summary,
            documentId: document.id,
            isVerified: true,
        };
    }

    /**
     * Generate structured case timeline from verified documents (FR18)
     * Outputs structured events: [{ date, event, sourceRef, documentId }]
     * 
     * @param {string} caseId 
     * @param {string} userId 
     */
    static async generateCaseTimeline(caseId, userId) {
        // Fetch all verified documents and their extracted date fields
        const sql = `
            SELECT d.id as document_id, d.title as document_title, d.doc_type, d.created_at,
                   ef.field_name, ef.field_value
            FROM documents d
            LEFT JOIN extracted_fields ef ON d.id = ef.document_id
            WHERE d.case_id = $1 AND d.verified = TRUE
            ORDER BY d.created_at ASC
        `;
        const res = await query(sql, [caseId]);

        const events = [];
        const seenDates = new Set();

        for (const row of res.rows) {
            let eventDate = row.created_at.toISOString().split("T")[0];
            let eventDescription = `Filing of ${row.doc_type}: ${row.document_title}`;

            if (row.field_name === "incident_date" && row.field_value) {
                eventDate = row.field_value;
                eventDescription = `Incident occurred as recorded in ${row.document_title}`;
            }

            const key = `${eventDate}_${row.document_id}`;
            if (!seenDates.has(key)) {
                seenDates.add(key);
                events.push({
                    date: eventDate,
                    event: eventDescription,
                    sourceRef: `${row.document_title} (${row.doc_type})`,
                    documentId: row.document_id,
                });
            }
        }

        // Sort events chronologically where possible
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        await AIQueryLogModel.logQuery({
            userId,
            caseId,
            queryText: "Generate case timeline",
            retrievedChunkIds: [],
            responseText: `Generated ${events.length} timeline events.`,
            citations: events.map(e => ({ documentId: e.documentId, sourceRef: e.sourceRef })),
        });

        return {
            disclaimer: AI_CONSTANTS.DISCLAIMER,
            timeline: events,
            totalEvents: events.length,
        };
    }
}
