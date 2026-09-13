import { LedgerModel } from "../models/ledger.model.js";
import { CaseModel } from "../models/case.model.js";
import { DocumentModel } from "../models/document.model.js";
import { AuditReportGenerator } from "../utils/audit-report.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { query } from "../config/db.js";
import { Logger } from "../utils/logger.js";

export class LedgerController {
    /**
     * Get complete ledger audit trail for a specific document
     * GET /api/v1/documents/:document_id/ledger
     */
    static getDocumentLedger = asyncHandler(async (req, res) => {
        const documentId = req.params.document_id;
        const entries = await LedgerModel.getByDocumentId(documentId);

        return res.status(200).json(
            new ApiResponse(
                200,
                { entries, count: entries.length },
                "Document ledger entries retrieved successfully."
            )
        );
    });

    /**
     * Walk entire hash-chain ledger and verify cryptographic integrity (FR14)
     * Returns pass/fail + identifies exact broken link if any
     * GET /api/v1/ledger/verify-chain
     */
    static verifyChainIntegrity = asyncHandler(async (req, res) => {
        const verification = await LedgerModel.verifyLedgerIntegrity();

        return res.status(200).json(
            new ApiResponse(
                200,
                verification,
                verification.valid
                    ? "Cryptographic hash chain is valid and unbroken. Zero tampering detected."
                    : `INTEGRITY VIOLATION DETECTED: Tampered entry located at index ${verification.brokenIndex} (Ledger ID: ${verification.brokenEntryId}).`
            )
        );
    });

    /**
     * Export formal Case Audit Report (Section 65B / BSA compliant) (FR15)
     * GET /api/v1/cases/:case_id/audit-report
     */
    static getCaseAuditReport = asyncHandler(async (req, res) => {
        const caseId = req.params.case_id;

        const caseRecord = await CaseModel.findById(caseId);
        if (!caseRecord) {
            throw new ApiError(404, "Case not found.");
        }

        const documents = await DocumentModel.listByCase(caseId);

        // Fetch ledger entries related to documents of this case
        const ledgerSql = `
            SELECT le.*, d.title as document_title, u.name as actor_name, u.role as actor_role
            FROM ledger_entries le
            JOIN documents d ON le.document_id = d.id
            JOIN users u ON le.actor_id = u.id
            WHERE d.case_id = $1
            ORDER BY le.id ASC
        `;
        const ledgerRes = await query(ledgerSql, [caseId]);

        const report = AuditReportGenerator.generateReport({
            caseRecord,
            documents,
            ledgerEntries: ledgerRes.rows,
            generatedBy: req.user,
        });

        // If client requested text or markdown download
        if (req.query.format === "text") {
            const certText = AuditReportGenerator.exportToSection65BCertificate(report);
            res.setHeader("Content-Type", "text/plain");
            res.setHeader("Content-Disposition", `attachment; filename="Case_${caseRecord.case_number}_Audit_Certificate.txt"`);
            return res.send(certText);
        }

        return res.status(200).json(
            new ApiResponse(200, { report }, "Case audit certificate generated successfully.")
        );
    });

    /**
     * Live Tamper Simulation Endpoint (for Live Evaluation Demo)
     * Deliberately modifies a hash in ledger_entries to prove that verifyChainIntegrity catches it immediately.
     * POST /api/v1/ledger/simulate-tamper
     */
    static simulateTamper = asyncHandler(async (req, res) => {
        const { ledgerId } = req.body;

        let targetId = ledgerId;
        if (!targetId) {
            // Pick the latest entry
            const latest = await LedgerModel.getLatestEntry();
            if (!latest) {
                throw new ApiError(400, "No ledger entries exist to tamper with.");
            }
            targetId = latest.id;
        }

        // Alter document_hash with corrupted value
        const fakeHash = "TAMPERED_HASH_00000000000000000000000000000000000000000000000000";
        await query("UPDATE ledger_entries SET document_hash = $1 WHERE id = $2", [fakeHash, targetId]);

        Logger.warn(`[DEMO] Simulated tampering on ledger entry ID: ${targetId}`);

        // Run immediate integrity check to show result
        const verification = await LedgerModel.verifyLedgerIntegrity();

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    tamperedLedgerId: targetId,
                    verificationResult: verification,
                },
                "Tamper simulation completed. Hash mismatch introduced into ledger chain."
            )
        );
    });
}
