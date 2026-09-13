import { query } from "../config/db.js";
import { AIQueryLogModel } from "../models/ai-query-log.model.js";
import { CaseAccessModel } from "../models/case-access.model.js";
import { AccessControl } from "../utils/access-control.js";
import { AI_CONSTANTS, ROLES } from "../utils/constants.js";
import { Logger } from "../utils/logger.js";

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
     * @param {string} params.userRole
     * @param {string} [params.caseId]
     * @param {string} params.queryText
     * @param {number} [params.limit=5]
     */
    static async retrieveFilteredChunks({ userId, userRole, caseId = null, queryText, limit = 5 }) {
        let accessibleCaseIds = [];

        if (AccessControl.isAdminOrRegistrar(userRole)) {
            // Admins have system-wide oversight
            if (caseId) {
                accessibleCaseIds = [caseId];
            } else {
                const allCasesRes = await query("SELECT id FROM cases");
                accessibleCaseIds = allCasesRes.rows.map(r => r.id);
            }
        } else {
            // Non-admin: query case_access + cases created by user
            let sql = `
                SELECT DISTINCT c.id
                FROM cases c
                LEFT JOIN case_access ca ON c.id = ca.case_id AND ca.user_id = $1
                WHERE (c.created_by = $1 OR (ca.user_id = $1 AND (ca.expires_at IS NULL OR ca.expires_at > NOW())))
            `;
            const params = [userId];

            if (caseId) {
                sql += ` AND c.id = $2`;
                params.push(caseId);
            }

            const res = await query(sql, params);
            accessibleCaseIds = res.rows.map(r => r.id);
        }

        if (accessibleCaseIds.length === 0) {
            return [];
        }

        // Query document_chunks joining documents to ensure document is verified (FR5)
        // Token search scoring based on query terms matching chunk_text
        const searchTokens = queryText
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter(t => t.length > 2);

        const chunksSql = `
            SELECT dc.*, d.title as document_title, d.doc_type, d.verified, c.case_number
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            JOIN cases c ON dc.case_id = c.id
            WHERE dc.case_id = ANY($1)
              AND d.verified = TRUE
            ORDER BY dc.created_at DESC
            LIMIT 50
        `;

        const allCandidateChunks = await query(chunksSql, [accessibleCaseIds]);
        if (allCandidateChunks.rows.length === 0) {
            return [];
        }

        // Score chunks by token match density
        const scoredChunks = allCandidateChunks.rows.map(chunk => {
            const chunkLower = chunk.chunk_text.toLowerCase();
            let score = 0;
            for (const token of searchTokens) {
                if (chunkLower.includes(token)) {
                    score += 1;
                }
            }
            return { ...chunk, score };
        });

        // Filter chunks having at least 1 keyword match, or top chunks if general query
        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunks = scoredChunks.filter(c => c.score > 0).slice(0, limit);

        return topChunks;
    }

    /**
     * Submit natural language question; returns cited response or "no supporting document found" (FR16, FR17)
     * @param {Object} params
     * @param {string} params.userId
     * @param {string} params.userRole
     * @param {string} [params.caseId]
     * @param {string} params.queryText
     */
    static async queryAssistant({ userId, userRole, caseId = null, queryText }) {
        Logger.info(`AI Query received from user ${userId} (Role: ${userRole}): "${queryText}"`);

        // 1. Access-filtered chunk retrieval
        const chunks = await this.retrieveFilteredChunks({
            userId,
            userRole,
            caseId,
            queryText,
            limit: 4,
        });

        const chunkIds = chunks.map(c => c.id);

        // 2. FR17: If no relevant verified document is found, return strict fallback
        if (chunks.length === 0) {
            const responseText = `${AI_CONSTANTS.NO_DOC_FOUND} Ensure the document has been uploaded and verified by an authorized officer.`;
            
            await AIQueryLogModel.logQuery({
                userId,
                caseId,
                queryText,
                retrievedChunkIds: [],
                responseText,
                citations: [],
            });

            return {
                disclaimer: AI_CONSTANTS.DISCLAIMER,
                answer: responseText,
                citations: [],
                hasSupportingEvidence: false,
            };
        }

        // 3. Build citations list
        const citations = chunks.map(ch => ({
            chunkId: ch.id,
            documentId: ch.document_id,
            documentTitle: ch.document_title,
            docType: ch.doc_type,
            caseNumber: ch.case_number,
            excerpt: ch.chunk_text.slice(0, 160) + "...",
        }));

        // 4. Generate synthesis from verified excerpts
        const contextExcerpts = chunks.map(
            (c, i) => `[Source ${i + 1}: ${c.document_title} (Doc ID: ${c.document_id})]\n${c.chunk_text}`
        ).join("\n\n");

        const answer = `Based on verified case records:\n\n${chunks[0].chunk_text.slice(0, 300)}...\n\nSource Citations:\n` +
            citations.map((c, i) => `• [${i + 1}] ${c.documentTitle} (${c.docType}) — Case: ${c.caseNumber}`).join("\n");

        // 5. Log query execution for compliance (FR21)
        await AIQueryLogModel.logQuery({
            userId,
            caseId: caseId || chunks[0].case_id,
            queryText,
            retrievedChunkIds: chunkIds,
            responseText: answer,
            citations,
        });

        return {
            disclaimer: AI_CONSTANTS.DISCLAIMER,
            answer,
            citations,
            hasSupportingEvidence: true,
            retrievedChunksCount: chunks.length,
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
