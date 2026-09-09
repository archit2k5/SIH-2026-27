import { verifyChainIntegrity } from "./crypto.js";

/**
 * Generates an exportable, court-admissible audit certificate and ledger report
 * aligned with IT Act 2000 & Bharatiya Sakshya Adhiniyam (BSA) / Section 65B standards.
 */
export class AuditReportGenerator {
    /**
     * Generate a comprehensive structured audit report for a case
     * @param {Object} params
     * @param {Object} params.caseRecord - Case metadata (case_number, title, status)
     * @param {Array<Object>} params.documents - List of documents in the case
     * @param {Array<Object>} params.ledgerEntries - Chronological ledger entries for the case
     * @param {Object} params.generatedBy - Officer / Admin requesting the report
     * @returns {Object} Structured audit report with integrity verification
     */
    static generateReport({ caseRecord, documents = [], ledgerEntries = [], generatedBy }) {
        // Run cryptographic chain verification on all provided entries
        const integrityCheck = verifyChainIntegrity(ledgerEntries);

        const reportTimestamp = new Date().toISOString();
        const docCount = documents.length;
        const verifiedDocCount = documents.filter((d) => d.verified).length;

        // Map entries into human-readable evidentiary events
        const eventTrail = ledgerEntries.map((entry, index) => ({
            seq: index + 1,
            ledgerId: entry.id,
            action: entry.action,
            actorName: entry.actor_name || "Unknown Officer",
            actorRole: entry.actor_role || "N/A",
            documentTitle: entry.document_title || entry.title || "N/A",
            documentHash: entry.document_hash,
            entryHash: entry.this_entry_hash,
            prevHash: entry.previous_entry_hash,
            timestamp: entry.timestamp,
            hasSignature: Boolean(entry.signature),
        }));

        return {
            reportTitle: "OFFICIAL ELECTRONIC RECORD AUDIT CERTIFICATE",
            complianceStandard: "IT Act 2000 / Bharatiya Sakshya Adhiniyam (BSA) 2023",
            generatedAt: reportTimestamp,
            generatedBy: {
                name: generatedBy?.name || "Authorized System Officer",
                role: generatedBy?.role || "System Admin",
            },
            caseSummary: {
                caseNumber: caseRecord?.case_number,
                title: caseRecord?.title,
                status: caseRecord?.status,
                totalDocuments: docCount,
                verifiedDocuments: verifiedDocCount,
            },
            cryptographicIntegrity: {
                chainStatus: integrityCheck.valid ? "VALID - UNBROKEN" : "TAMPER_DETECTED",
                totalLedgerEntries: ledgerEntries.length,
                brokenIndex: integrityCheck.brokenIndex,
                brokenEntryId: integrityCheck.brokenEntryId,
                tamperReason: integrityCheck.reason,
            },
            evidentiaryTrail: eventTrail,
        };
    }

    /**
     * Format the audit report as clean court-ready Markdown text
     * @param {Object} report Output from generateReport
     * @returns {string} Markdown formatted report
     */
    static formatToMarkdown(report) {
        return `
# ${report.reportTitle}
**Compliance Standard:** ${report.complianceStandard}  
**Date of Issue:** ${report.generatedAt}  
**Authorized Signatory:** ${report.generatedBy.name} (${report.generatedBy.role})  

---

## 1. Case Details
- **Case Number:** ${report.caseSummary.caseNumber}
- **Title:** ${report.caseSummary.title}
- **Status:** ${report.caseSummary.status}
- **Total Case Documents:** ${report.caseSummary.totalDocuments} (Human-Verified: ${report.caseSummary.verifiedDocuments})

## 2. Cryptographic Integrity Status
- **Hash-Chain Status:** **${report.cryptographicIntegrity.chainStatus}**
- **Total Ledger Actions Recorded:** ${report.cryptographicIntegrity.totalLedgerEntries}
${
    report.cryptographicIntegrity.brokenIndex !== null
        ? `> [!CAUTION]\n> TAMPERING DETECTED at entry ID #${report.cryptographicIntegrity.brokenEntryId}: ${report.cryptographicIntegrity.tamperReason}`
        : `> [!NOTE]\n> Mathematical integrity verified. All document hashes and actor signatures match the ledger hash chain.`
}

## 3. Evidentiary Action Log
| Seq | Action | Officer / Actor | Timestamp | Document Hash (SHA-256) | Signature |
|---|---|---|---|---|---|
${report.evidentiaryTrail
    .map(
        (e) =>
            `| ${e.seq} | ${e.action} | ${e.actorName} (${e.actorRole}) | ${new Date(e.timestamp).toLocaleString()} | \`${e.documentHash ? e.documentHash.slice(0, 16) + "..." : "N/A"}\` | ${e.hasSignature ? "Signed" : "System"} |`
    )
    .join("\n")}

---
*Certificate generated electronically by Secure Digital Document Management System. Tamper-evident hash-chain validated.*
`;
    }
}
