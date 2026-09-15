import { pool, query, initDb } from "./db.js";
import { UserModel } from "../models/user.model.js";
import { CaseModel } from "../models/case.model.js";
import { CaseAccessModel } from "../models/case-access.model.js";
import { DocumentModel } from "../models/document.model.js";
import { DocumentContentModel } from "../models/document-content.model.js";
import { DocumentVersionModel } from "../models/document-version.model.js";
import { ExtractedFieldModel } from "../models/extracted-field.model.js";
import { LedgerModel } from "../models/ledger.model.js";
import { PipelineService } from "../services/pipeline.service.js";
import { generateKeyPair, sha256, signData } from "../utils/crypto.js";
import { ROLES, CASE_STATUS, ACCESS_LEVEL, DOC_TYPE, LEDGER_ACTION, SENSITIVITY_LEVEL } from "../utils/constants.js";
import { Logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";

/**
 * Idempotent database seeder for demo & evaluation
 */
export async function seedDatabase() {
    Logger.info("Starting database seed...");

    // 1. Seed Personas
    const personas = [
        {
            name: "Admin Officer Sharma",
            email: "admin@dms.gov.in",
            password: "AdminPassword123!",
            role: ROLES.ADMIN,
            mfaEnabled: false,
        },
        {
            name: "Registrar P. Nambiar",
            email: "registrar@dms.gov.in",
            password: "RegistrarPass123!",
            role: ROLES.REGISTRAR,
            mfaEnabled: false,
        },
        {
            name: "Inspector Vikram Singh (IO)",
            email: "io.vikram@police.gov.in",
            password: "InspectorPass123!",
            role: ROLES.IO,
            mfaEnabled: false,
        },
        {
            name: "Adv. Ananya Roy (Prosecutor)",
            email: "prosecutor.roy@judiciary.gov.in",
            password: "ProsecutorPass123!",
            role: ROLES.PROSECUTOR,
            mfaEnabled: false,
        },
        {
            name: "Hon'ble Justice K. S. Reddy (Judge)",
            email: "judge.reddy@court.gov.in",
            password: "JudgePassword123!",
            role: ROLES.JUDGE,
            mfaEnabled: false,
        },
        {
            name: "Dr. Sunita Mehta (Forensic Expert)",
            email: "forensic.mehta@cfsl.gov.in",
            password: "ForensicPass123!",
            role: ROLES.FORENSIC_EXPERT,
            mfaEnabled: false,
        },
    ];

    const createdUsers = {};

    for (const p of personas) {
        let user = await UserModel.findByEmail(p.email);
        if (!user) {
            const { publicKey, privateKey } = generateKeyPair();
            user = await UserModel.create({
                name: p.name,
                email: p.email,
                password: p.password,
                role: p.role,
                publicKey,
                mfaEnabled: p.mfaEnabled,
            });
            user._privateKey = privateKey;
            Logger.info(`Seeded Persona: ${p.role} (${p.email})`);
        }
        createdUsers[p.role] = user;
    }

    const ioUser = createdUsers[ROLES.IO];
    const prosecutorUser = createdUsers[ROLES.PROSECUTOR];
    const adminUser = createdUsers[ROLES.ADMIN];

    // 2. Seed Sample Case
    const sampleCaseNumber = "FIR-2026-DL-001";
    let sampleCase = await CaseModel.findByCaseNumber(sampleCaseNumber);

    if (!sampleCase) {
        sampleCase = await CaseModel.create({
            caseNumber: sampleCaseNumber,
            title: "State vs. R. Verma - Financial Data Intrusion & Embezzlement",
            description: "Investigation into unauthorized system breach, account data manipulation, and diversion of funds under IT Act Sec 66/43 and IPC 420.",
            status: CASE_STATUS.OPEN,
            createdBy: ioUser.id,
        });
        Logger.info(`Seeded Case: ${sampleCase.case_number}`);

        // Grant access to IO and Prosecutor
        await CaseAccessModel.grantAccess({
            caseId: sampleCase.id,
            userId: ioUser.id,
            accessLevel: ACCESS_LEVEL.APPROVE,
            grantedBy: adminUser.id,
        });

        await CaseAccessModel.grantAccess({
            caseId: sampleCase.id,
            userId: prosecutorUser.id,
            accessLevel: ACCESS_LEVEL.WRITE,
            grantedBy: adminUser.id,
        });

        // 3. Seed Sample Stored File & Document
        const uploadsDir = path.resolve("./uploads/sample");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const sampleDocText = `FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)
Police Station: Cyber Crime Cell, New Delhi
FIR No: FIR-2026-DL-001
Date of Incident: 14/01/2026
Complainant: Axis Digital Payments Ltd. (represented by Rajiv Sen)
Accused: Rajesh Verma (ex-employee)
Sections of Law: Section 66, Section 43 of Information Technology Act 2000, Section 420 IPC
Investigating Officer: Inspector Vikram Singh

Brief Details:
On 14/01/2026, the accused allegedly logged into the core payment database using stolen administrator credentials, modified 14 audit log files, and diverted funds totaling INR 48,00,000 to an offshore escrow account. Digital forensic disk images have been sealed and sent to CFSL for bitstream analysis.`;

        const sampleDocPath = path.join(uploadsDir, "FIR_Cyber_Fraud_001.txt");
        fs.writeFileSync(sampleDocPath, sampleDocText, "utf8");
        const docHash = sha256(sampleDocText);

        const sampleDoc = await DocumentModel.create({
            caseId: sampleCase.id,
            docType: DOC_TYPE.FIR,
            title: "First Information Report - Cyber Intrusions",
            storagePath: path.relative(path.resolve("."), sampleDocPath),
            originalHash: docHash,
            language: "en",
            verified: true, // Human verified
            uploadedBy: ioUser.id,
        });

        await DocumentModel.updateSensitivity(sampleDoc.id, SENSITIVITY_LEVEL.CONFIDENTIAL);

        // Version 1
        await DocumentVersionModel.createVersion({
            documentId: sampleDoc.id,
            versionNumber: 1,
            storagePath: sampleDoc.storage_path,
            hash: docHash,
            createdBy: ioUser.id,
            changeSummary: "Original certified FIR submission",
        });

        // NER Fields
        const nerFields = [
            { fieldName: "case_number", fieldValue: "FIR-2026-DL-001", confidence: 0.98 },
            { fieldName: "accused_name", fieldValue: "Rajesh Verma", confidence: 0.94 },
            { fieldName: "complainant_name", fieldValue: "Rajiv Sen (Axis Digital Payments)", confidence: 0.92 },
            { fieldName: "incident_date", fieldValue: "14/01/2026", confidence: 0.96 },
            { fieldName: "sections_of_law", fieldValue: "Sec 66, 43 IT Act; Sec 420 IPC", confidence: 0.95 },
            { fieldName: "jurisdiction_station", fieldValue: "Cyber Crime Cell, New Delhi", confidence: 0.91 },
        ];

        await ExtractedFieldModel.saveFields(sampleDoc.id, nerFields);
        await ExtractedFieldModel.verifyFields(sampleDoc.id, ioUser.id, nerFields);

        // Ledger chain
        await LedgerModel.appendEntry({
            documentId: sampleDoc.id,
            action: LEDGER_ACTION.UPLOAD,
            actorId: ioUser.id,
            documentHash: docHash,
            metadata: { note: "Seeded initial FIR record" },
        });

        await LedgerModel.appendEntry({
            documentId: sampleDoc.id,
            action: LEDGER_ACTION.EXTRACT,
            actorId: ioUser.id,
            documentHash: docHash,
            metadata: { entitiesCount: nerFields.length },
        });

        const sig = signData(docHash, ioUser._privateKey || generateKeyPair().privateKey);
        await LedgerModel.appendEntry({
            documentId: sampleDoc.id,
            action: LEDGER_ACTION.VERIFY,
            actorId: ioUser.id,
            documentHash: docHash,
            signature: sig,
            metadata: { verifiedBy: ioUser.name, role: ioUser.role },
        });

        // Store extracted content so it can be chunked/embedded below
        await DocumentContentModel.createOrUpdate({
            documentId: sampleDoc.id,
            extractedText: sampleDocText,
            extractionMethod: "seed_fixture",
        });

        // Index for RAG
        await PipelineService.indexForRAG(sampleDoc.id);

        Logger.info("Seeded sample document, ledger entries, and RAG index.");
    }

    Logger.info("Database seed completed successfully.");
}

// Allow direct execution via `node src/config/seed.js`
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
    (async () => {
        try {
            await initDb();
            await seedDatabase();
            await pool.end();
            process.exit(0);
        } catch (err) {
            console.error("Seed error:", err);
            process.exit(1);
        }
    })();
}