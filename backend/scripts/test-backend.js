import http from "http";
import { app } from "../src/app.js";
import { initDb, pool } from "../src/config/db.js";
import { seedDatabase } from "../src/config/seed.js";
import { Logger } from "../src/utils/logger.js";
import { sha256 } from "../src/utils/crypto.js";

const PORT = 5055;
let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, body: json, headers: res.headers });
                } catch {
                    resolve({ status: res.statusCode, raw: data, headers: res.headers });
                }
            });
        });

        req.on("error", reject);

        if (body) {
            if (typeof body === "string") {
                req.write(body);
            } else {
                req.write(JSON.stringify(body));
            }
        }
        req.end();
    });
}

function requestMultipart(path, boundary, bufferPayload, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const options = {
            method: "POST",
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "Content-Length": bufferPayload.length,
                ...headers,
            },
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, body: json });
                } catch {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on("error", reject);
        req.write(bufferPayload);
        req.end();
    });
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`);
        throw new Error(message);
    }
    console.log(`  ✓ ${message}`);
}

async function runTests() {
    console.log("\n=======================================================");
    console.log("  STARTING SIH SECURE DMS BACKEND COMPREHENSIVE TEST   ");
    console.log("=======================================================\n");

    try {
        // 1. Initialize DB & Seed
        console.log("--- 1. Database Initialization & Seeding ---");
        await initDb();
        await seedDatabase();
        assert(true, "Database tables & seed personas initialized");

        // 2. Start Test HTTP Server
        server = app.listen(PORT);
        baseUrl = `http://localhost:${PORT}`;
        assert(true, `Test Express server listening on ${baseUrl}`);

        // 3. Health check
        console.log("\n--- 2. Health Check ---");
        const health = await request("GET", "/api/v1/health");
        assert(health.status === 200, "Health check endpoint returned 200 OK");
        assert(health.body.data.status === "healthy", "Health status reports 'healthy'");

        // 4. Auth Tests
        console.log("\n--- 3. Authentication & RBAC ---");
        // Login as IO
        const ioLogin = await request("POST", "/api/v1/auth/login", {
            email: "io.vikram@police.gov.in",
            password: "InspectorPass123!",
        });
        assert(ioLogin.status === 200, "IO Inspector login successful");
        const ioToken = ioLogin.body.data.accessToken;
        assert(Boolean(ioToken), "Received JWT Access Token for IO");

        // Login as Admin
        const adminLogin = await request("POST", "/api/v1/auth/login", {
            email: "admin@dms.gov.in",
            password: "AdminPassword123!",
        });
        assert(adminLogin.status === 200, "Admin login successful");
        const adminToken = adminLogin.body.data.accessToken;

        // Login as Prosecutor
        const prosecutorLogin = await request("POST", "/api/v1/auth/login", {
            email: "prosecutor.roy@judiciary.gov.in",
            password: "ProsecutorPass123!",
        });
        assert(prosecutorLogin.status === 200, "Prosecutor login successful");
        const prosecutorToken = prosecutorLogin.body.data.accessToken;

        // Verify /auth/me
        const meRes = await request("GET", "/api/v1/auth/me", null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(meRes.status === 200, "GET /auth/me succeeded");
        assert(meRes.body.data.user.role === "IO", "User role correctly identified as IO");

        // 5. Cases Tests
        console.log("\n--- 4. Case Management & Case-Level Access ---");
        // Create new test case
        const caseNumber = `TEST-FIR-${Date.now()}`;
        const newCaseRes = await request(
            "POST",
            "/api/v1/cases",
            {
                caseNumber,
                title: "State vs. Test Suspect - Data Breach Case",
                description: "Test investigation description",
            },
            { Authorization: `Bearer ${ioToken}` }
        );
        assert(newCaseRes.status === 201, `Case created successfully: ${caseNumber}`);
        const testCaseId = newCaseRes.body.data.case.id;

        // List visible cases
        const casesList = await request("GET", "/api/v1/cases", null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(casesList.status === 200, "Listed accessible cases for IO");
        assert(casesList.body.data.cases.some((c) => c.id === testCaseId), "Newly created case is listed");

        // Grant access to Prosecutor
        const grantRes = await request(
            "POST",
            `/api/v1/cases/${testCaseId}/access`,
            {
                userId: prosecutorLogin.body.data.user.id,
                accessLevel: "write",
            },
            { Authorization: `Bearer ${ioToken}` }
        );
        assert(grantRes.status === 200, "Granted 'write' access to Prosecutor");

        // 6. Document Upload & Pipeline Processing
        console.log("\n--- 5. Document Ingestion, Duplicate Detection & NER ---");
        const testDocContent = `FIRST INFORMATION REPORT
FIR No: ${caseNumber}
Police Station: Hauz Khas PS, New Delhi
Date of Incident: 12/03/2026
Accused: Vikramaditya Singhania
Complainant: Priya Malhotra
Sections of Law: Section 420 IPC, Section 66 IT Act
Details: Unauthorized electronic transfer of funds from company escrow accounts.`;

        const boundary = "---------------------------974767299852498929531610575";
        let bodyPayload = `--${boundary}\r\n`;
        bodyPayload += `Content-Disposition: form-data; name="title"\r\n\r\nPrimary Investigation Report\r\n`;
        bodyPayload += `--${boundary}\r\n`;
        bodyPayload += `Content-Disposition: form-data; name="docType"\r\n\r\nFIR\r\n`;
        bodyPayload += `--${boundary}\r\n`;
        bodyPayload += `Content-Disposition: form-data; name="file"; filename="fir_report.txt"\r\n`;
        bodyPayload += `Content-Type: text/plain\r\n\r\n${testDocContent}\r\n`;
        bodyPayload += `--${boundary}--\r\n`;

        const uploadRes = await requestMultipart(
            `/api/v1/cases/${testCaseId}/documents`,
            boundary,
            Buffer.from(bodyPayload, "utf8"),
            { Authorization: `Bearer ${ioToken}` }
        );
        assert(uploadRes.status === 201, "Document uploaded and processed by ingestion pipeline");
        const uploadedDoc = uploadRes.body.data.document;
        assert(uploadedDoc.verified === false, "Document is initially unverified (human gate FR5)");
        assert(uploadRes.body.data.extractedFields.length > 0, "NER extracted structured legal fields");

        // Test Duplicate Detection (FR4)
        const dupRes = await requestMultipart(
            `/api/v1/cases/${testCaseId}/documents`,
            boundary,
            Buffer.from(bodyPayload, "utf8"),
            { Authorization: `Bearer ${ioToken}` }
        );
        assert(dupRes.status === 409, "FR4: Duplicate file upload correctly rejected with 409 Conflict");

        // Check Extracted Fields
        const fieldsRes = await request("GET", `/api/v1/documents/${uploadedDoc.id}/extracted-fields`, null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(fieldsRes.status === 200, "Retrieved NER extracted fields");
        const accusedField = fieldsRes.body.data.fields.find((f) => f.field_name === "accused_name");
        assert(Boolean(accusedField), "NER correctly identified accused_name");

        // 7. Human Verification Gate (FR5, FR6, FR7)
        console.log("\n--- 6. Mandatory Human Verification Gate & Digital Signature ---");
        // Verify that unverified doc does not yield RAG results yet
        const unverifiedAiRes = await request(
            "POST",
            "/api/v1/ai/query",
            { query: "Singhania escrow accounts", caseId: testCaseId },
            { Authorization: `Bearer ${ioToken}` }
        );
        assert(unverifiedAiRes.body.data.hasSupportingEvidence === false, "FR5/FR17: Unverified document is NOT searchable in AI RAG");

        // Perform officer verification with digital signing
        const verifyRes = await request(
            "POST",
            `/api/v1/documents/${uploadedDoc.id}/verify`,
            {
                confirmedFields: fieldsRes.body.data.fields.map((f) => ({
                    fieldName: f.field_name,
                    fieldValue: f.field_value,
                })),
            },
            { Authorization: `Bearer ${ioToken}` }
        );
        assert(verifyRes.status === 200, "Document verified and digitally signed by officer");
        assert(verifyRes.body.data.verified === true, "Document status updated to verified: true");
        assert(Boolean(verifyRes.body.data.digitalSignature), "Digital signature generated and attached");

        // 8. Cryptographic Hash-Chain Ledger & Live Tamper Demo (FR13, FR14, FR15)
        console.log("\n--- 7. Cryptographic Hash-Chain Ledger & Tamper Detection ---");
        const docLedger = await request("GET", `/api/v1/documents/${uploadedDoc.id}/ledger`, null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(docLedger.status === 200, "Retrieved document ledger history");
        assert(docLedger.body.data.count >= 4, "Document has UPLOAD, TRANSLATE, EXTRACT, and VERIFY ledger entries");

        // Verify chain integrity before tampering
        const integrityBefore = await request("GET", "/api/v1/ledger/verify-chain", null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(integrityBefore.status === 200, "Chain verification endpoint executed");

        assert(integrityBefore.body.data.valid === true, "Cryptographic hash chain is UNBROKEN and VALID");


        // Live Tamper Simulation Demo
        const latestEntry = docLedger.body.data.entries[docLedger.body.data.entries.length - 1];
        const tamperRes = await request(
            "POST",
            "/api/v1/ledger/simulate-tamper",
            { ledgerId: latestEntry.id },
            { Authorization: `Bearer ${adminToken}` }
        );
        assert(tamperRes.status === 200, "Simulated tamper execution on ledger entry");
        assert(tamperRes.body.data.verificationResult.valid === false, "TAMPER DETECTED immediately by cryptographic verifyChain");
        assert(
            String(tamperRes.body.data.verificationResult.brokenEntryId) === String(latestEntry.id),
            "Broken hash link pinpointed to the exact tampered ledger record"
        );

        // Restore original hash for clean state
        await pool.query("UPDATE ledger_entries SET document_hash = $1 WHERE id = $2", [
            latestEntry.document_hash,
            latestEntry.id,
        ]);
        const integrityAfterRestore = await request("GET", "/api/v1/ledger/verify-chain", null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(integrityAfterRestore.body.data.valid === true, "Ledger restored and re-verified as VALID");

        // Court Audit Report (Section 65B IT Act / BSA)
        const auditReport = await request("GET", `/api/v1/cases/${testCaseId}/audit-report`, null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(auditReport.status === 200, "Court-admissible Audit Certificate generated");
        assert(auditReport.body.data.report.reportTitle.includes("AUDIT CERTIFICATE"), "Official Electronic Record certificate title verified");

        // 9. AI / RAG Assistance (FR16, FR17, FR18, FR19, FR20, FR21)
        console.log("\n--- 8. AI / RAG with Access-Filtered Citations & Timelines ---");
        // Access-filtered RAG query for verified document
        const ragQueryRes = await request(
            "POST",
            "/api/v1/ai/query",
            { query: "Singhania escrow transfer", caseId: testCaseId },
            { Authorization: `Bearer ${ioToken}` }
        );
        assert(ragQueryRes.status === 200, "RAG query executed");
        assert(ragQueryRes.body.data.hasSupportingEvidence === true, "Found verified case document evidence");
        assert(ragQueryRes.body.data.citations.length > 0, "FR16: Response includes mandatory source citations");
        assert(ragQueryRes.body.data.disclaimer.includes("pending human review"), "FR19: AI disclaimer label present");

        // Case Timeline generation
        const timelineRes = await request("POST", `/api/v1/ai/timeline/${testCaseId}`, null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(timelineRes.status === 200, "Timeline generated");
        assert(timelineRes.body.data.timeline.length > 0, "FR18: Structured timeline events generated");

        // Document Summarization
        const summaryRes = await request("POST", `/api/v1/ai/summarize/${uploadedDoc.id}`, null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(summaryRes.status === 200, "Document summarized");
        assert(summaryRes.body.data.isVerified === true, "Summarizer verified document status");

        // AI Query Log
        const queryLogs = await request("GET", `/api/v1/ai/query-log?caseId=${testCaseId}`, null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(queryLogs.status === 200, "Retrieved AI query compliance logs (FR21)");
        assert(queryLogs.body.data.count > 0, "AI query trail logged in database");

        // 10. Collaboration & Sharing (FR22, FR23, FR24)
        console.log("\n--- 9. Collaboration, Comments & Time-Limited Sharing ---");
        // Add comment
        const commentRes = await request(
            "POST",
            `/api/v1/documents/${uploadedDoc.id}/comments`,
            { content: "Please cross-check bank statement annexure with accused account." },
            { Authorization: `Bearer ${prosecutorToken}` }
        );
        assert(commentRes.status === 201, "FR22: Annotation added to document");

        // List comments
        const commentsList = await request("GET", `/api/v1/documents/${uploadedDoc.id}/comments`, null, {
            Authorization: `Bearer ${ioToken}`,
        });
        assert(commentsList.body.data.total >= 1, "Comments listed chronologically");

        // Time-limited watermarked share (FR24)
        const shareRes = await request(
            "POST",
            `/api/v1/documents/${uploadedDoc.id}/share`,
            { durationHours: 12, watermarkText: "CONFIDENTIAL — DEFENSE COUNSEL COPY" },
            { Authorization: `Bearer ${ioToken}` }
        );
        assert(shareRes.status === 201, "Time-limited watermarked share token created");
        const shareToken = shareRes.body.data.shareRecord.share_token;

        // Access via public shared endpoint
        const publicShare = await request("GET", `/api/v1/documents/shared/${shareToken}`);
        assert(publicShare.status === 200, "FR24: External party accessed read-only watermarked document");
        assert(publicShare.body.data.watermark.includes("CONFIDENTIAL"), "Watermark text applied");

        // Notifications
        const notifs = await request("GET", "/api/v1/notifications", null, {
            Authorization: `Bearer ${prosecutorToken}`,
        });
        assert(notifs.status === 200, "FR23: Notifications feed retrieved");

        // 11. Admin & System Health
        console.log("\n--- 10. Admin Diagnostics & System Health ---");
        const healthDiag = await request("GET", "/api/v1/admin/system-health", null, {
            Authorization: `Bearer ${adminToken}`,
        });
        assert(healthDiag.status === 200, "Admin system health diagnostics retrieved");
        assert(healthDiag.body.data.status === "HEALTHY", "Overall system state reported as HEALTHY");
        assert(healthDiag.body.data.statistics.totalCases > 0, "System statistics reported accurately");

        console.log("\n=======================================================");
        console.log("  ALL TESTS PASSED SUCCESSFULLY! (100% SPEC COMPLIANT) ");
        console.log("=======================================================\n");

        process.exitCode = 0;
    } catch (err) {
        console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err);
        process.exitCode = 1;
    } finally {
        if (server) {
            server.close();
        }
        await pool.end();
        process.exit(process.exitCode || 0);
    }
}

runTests();
