# Product Requirements Document — Secure Digital Document Management System (DMS)

## 1. Background & Problem Statement

Law enforcement agencies, courts, and investigative organizations manage large volumes of sensitive documents (FIRs, investigation records, witness statements, charge sheets, court filings, evidence records, forensic reports, legal notices, judgments) across their case lifecycle. Most rely on paper-based or fragmented digital systems, leading to:

- Difficulty locating documents quickly
- Unauthorized access to confidential information
- Document tampering risks
- Lack of version control
- Inefficient inter-department collaboration
- Delays in legal/investigative processes
- Poor auditability and compliance tracking

## 2. Objective

Build a secure, centralized, intelligent Document Management System that enables law enforcement, legal institutions, and investigative departments to securely store, organize, retrieve, and share case documents — preserving legal validity and evidentiary integrity throughout.

## 3. Target Users / Personas

| Persona | Needs |
|---|---|
| Investigating Officer (IO) | Upload/manage documents for assigned cases, request AI-assisted search/timeline |
| Prosecutor | Access verified case documents, prepare for trial, collaborate with IO |
| Judge / Court Registrar | View case filings, judgments, ensure procedural compliance |
| Forensic Expert | Upload forensic reports, maintain chain of custody |
| Defense Counsel (external, scoped) | Time-bound, read-only access during trial period |
| System Admin | Manage users, roles, monitor system health and audit logs |

## 4. Scope

### In scope (hackathon prototype)
- Document upload, translation, NER extraction, human verification workflow
- RBAC with case-level and document-level access control
- Hash-chain tamper-evidence ledger with live integrity verification demo
- AI-assisted search, summarization, and timeline generation via access-filtered RAG, with mandatory source citation
- Secure sharing (time-limited links), comments/annotations, notifications
- Digital signatures on verification/approval actions
- Audit trail and exportable audit reports

### Out of scope (for this phase)
- Full integration with ICJS/CCTNS/eCourts (architected to be compatible, not implemented)
- Mobile native apps
- Full production-grade Hyperledger/blockchain deployment
- Multi-region high-availability infrastructure
- Automated redaction of sensitive PII in shared documents

## 5. Functional Requirements

### 5.1 Document Ingestion
- FR1: Users can upload documents (PDF, scanned images) tagged to a case
- FR2: System auto-translates non-English/regional-language documents while preserving the original
- FR3: System extracts structured fields (case number, names, dates, sections of law, document type) via NER
- FR4: Duplicate document detection on upload

### 5.2 Human Verification
- FR5: No document is searchable/AI-queryable until an authorized user verifies extracted fields
- FR6: Verification action requires a digital signature binding the verifying user's identity to that document version
- FR7: Verified documents are locked from silent edits — further changes create a new version

### 5.3 Access Control
- FR8: RBAC with defined roles (IO, Prosecutor, Judge, Forensic Expert, Registrar, Admin)
- FR9: Case-level access grants, separate from role — a user must be explicitly assigned to a case
- FR10: Time-bound access grants (e.g., defense counsel during trial only)
- FR11: MFA required for login
- FR12: Access checked at API gateway, case level, document level, and AI retrieval level

### 5.4 Integrity & Audit
- FR13: Every document action (upload, translate, extract, verify, view, edit, approve, share) logged to an append-only hash-chain ledger
- FR14: System provides an integrity-check function that walks the ledger and flags any broken link (tampering)
- FR15: Audit reports exportable per case for court/compliance use

### 5.5 AI Assistance
- FR16: Users can query case documents in natural language; system returns answers with cited source document references
- FR17: If no relevant verified document is found, system returns "no supporting document found" rather than a generated guess
- FR18: AI-generated timelines output structured events (date, event, source reference), not free prose
- FR19: All AI outputs labeled "AI-assisted — pending human review"
- FR20: RAG retrieval is filtered by the querying user's case-level permissions before reaching the LLM
- FR21: All AI queries and responses logged to `ai_query_log`

### 5.6 Collaboration
- FR22: Authorized users can comment/annotate documents within a case
- FR23: Users receive notifications on new/updated documents for their assigned cases
- FR24: Time-limited, watermarked, read-only sharing links for external stakeholders

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Security | AES-256 at rest, TLS in transit, OAuth2 + MFA, RBAC enforced at every API layer |
| Integrity | SHA-256 hash-chain ledger; tampering must be detectable and localizable to the exact broken entry |
| Privacy | AI service must not send case data to any third-party API; self-hosted LLM required |
| Auditability | Every access/action logged with actor, timestamp, and action type; logs immutable |
| Availability | Core document retrieval should not depend on AI service uptime (AI is additive, not blocking) |
| Usability | Verification workflow should take an officer under 2 minutes per document |
| Legal validity | Digital signatures compliant with IT Act 2000 provisions for evidentiary admissibility |

## 7. Success Metrics (for demo/evaluation)

- Time to retrieve a specific case document (target: under 10 seconds via search vs. manual paper search)
- 100% of AI responses include verifiable source citations
- Successful live demonstration of tamper detection (broken hash-chain link identified correctly)
- Zero unauthorized cross-case document access in access-control testing
- Verification-to-index latency (time from officer sign-off to document being AI-queryable)

## 8. Key Differentiators (vs. existing systems)

- Purpose-built for the Indian case lifecycle (FIR → chargesheet → trial), unlike Axon (media evidence only) or eCourts (citizen case-lookup only)
- Mandatory human verification before AI indexing — not enforced in comparable AI-document tools
- Access-filtered RAG retrieval — closes a common gap where AI search bypasses document-level permissions
- Lightweight hash-chain integrity — tamper-evidence without full blockchain infrastructure overhead
- Designed to complement, not duplicate, ICJS — sits as a secure document layer beneath ICJS's interoperability layer
- Multilingual and IPC/BNS-aligned for the Indian legal context

## 9. Assumptions & Risks

| Assumption/Risk | Mitigation |
|---|---|
| Officers will reliably perform verification step | Keep verification UI fast (under 2 min); make it a required gate, not optional |
| Self-hosted LLM has enough capability for legal-domain summarization | Use fine-tuned open-weight model; keep outputs structured/constrained rather than open-ended |
| OCR/translation errors on poor-quality scans | Human verification step catches these before data enters searchable index |
| Government cloud (MeghRaj) availability/cost | Architecture is cloud-agnostic; MinIO/Postgres/Docker portable to any infra |
| Adoption resistance from paper-based workflows | Phase rollout; keep UI simple; preserve original documents so nothing is "lost" in translation |

## 10. Milestones (Hackathon Timeline)

1. Core upload + storage + auth (RBAC, MFA) working end-to-end
2. Translation + NER extraction pipeline integrated
3. Human verification workflow + digital signatures
4. Hash-chain ledger with live tamper-detection demo
5. RAG indexing + access-filtered AI query with citations
6. UI polish + end-to-end demo script rehearsal
