# Architecture Document — Secure Digital Document Management System (DMS)

## 1. Overview

A centralized, secure platform for law enforcement, courts, and investigative departments to digitize, store, verify, search, and collaborate on case documents (FIRs, charge sheets, witness statements, forensic reports, court filings) with cryptographic integrity guarantees and human-verified AI assistance.

**Core design principles:**
- Zero blind trust in AI — every document is human-verified before it becomes AI-queryable
- Access control enforced at every layer, not just at login
- Tamper-evidence via lightweight cryptographic hash-chaining, not a full blockchain
- Original documents are never altered — only new, hashed, signed versions are added

---

## 2. High-Level Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (React.js)                        │
│         Case dashboard · Document viewer · Verification UI       │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ HTTPS/TLS
┌───────────────────────────────▼───────────────────────────────────┐
│                         API Gateway / Auth Layer                  │
│         OAuth2/SAML · MFA · JWT session validation                │
└───────────────────────────────┬───────────────────────────────────┘
                                 │
        ┌────────────────────────┼─────────────────────────┐
        ▼                        ▼                          ▼
┌───────────────┐      ┌──────────────────┐        ┌──────────────────┐
│  Core Backend   │      │  AI/NLP Service   │        │  Ledger Service   │
│ (Node.js/Django)│      │ (Python, isolated │        │ (hash-chain,      │
│  RBAC, case mgmt│      │  security zone)   │        │  append-only)     │
└───────┬────────┘      └────────┬──────────┘        └────────┬─────────┘
        │                        │                             │
        ▼                        ▼                             ▼
┌───────────────┐      ┌──────────────────┐        ┌──────────────────┐
│  PostgreSQL     │      │  Vector store      │        │  ledger_entries    │
│  (metadata,     │      │  (pgvector or      │        │  table (Postgres,  │
│  users, roles,  │      │  Qdrant/FAISS)     │        │  insert-only)      │
│  case data)     │      │                    │        │                    │
└───────────────┘      └──────────────────┘        └──────────────────┘
        │
        ▼
┌───────────────┐
│  MinIO          │
│  (encrypted     │
│  object storage │
│  — raw files)   │
└───────────────┘
```

---

## 3. Document Processing Pipeline

```
Upload → NLP Translation (IndicTrans2) → NER Extraction (spaCy/transformer)
   → MANDATORY Human Verification (digitally signed)
   → [Hash-chain ledger entry]  +  [RAG indexing, access-tagged]
   → Access-filtered retrieval → LLM query → Cited, source-traceable response
```

- **Original document** is stored as-is in MinIO, immutable, hashed (SHA-256) on upload.
- **Translation** produces a derived version, stored separately, also hashed. Original is always the legally authoritative copy.
- **NER extraction** produces structured JSON (schema-constrained) — case number, names, dates, IPC/BNS sections, document type — never free text passed downstream unvalidated.
- **Human verification** is a hard gate: nothing is indexed for AI search/RAG until an authorized officer/registrar confirms the extraction and signs it.
- **RAG indexing** only occurs post-verification, and every embedded chunk is tagged with case ID + access-control metadata.

---

## 4. Data Model (PostgreSQL — core tables)

### `users`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| role | enum | IO, Prosecutor, Judge, Forensic Expert, Registrar, Admin |
| public_key | text | for signature verification |
| mfa_enabled | boolean | |

### `cases`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| case_number | text unique | |
| status | enum | open, under_trial, closed |
| created_at | timestamp | |

### `case_access`
| column | type | notes |
|---|---|---|
| case_id | uuid FK | |
| user_id | uuid FK | |
| access_level | enum | read, write, approve |
| expires_at | timestamp nullable | time-bound access (e.g., defense counsel) |

### `documents`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK | |
| doc_type | enum | FIR, chargesheet, witness_statement, forensic_report, judgment, other |
| storage_path | text | pointer to MinIO object |
| original_hash | text | SHA-256 of raw file |
| language | text | detected source language |
| verified | boolean | gate for RAG eligibility |
| current_version | int | |

### `document_versions`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| document_id | uuid FK | |
| version_number | int | |
| storage_path | text | |
| hash | text | |
| created_by | uuid FK → users | |

### `extracted_fields`
| column | type | notes |
|---|---|---|
| document_id | uuid FK | |
| field_name | text | e.g. "case_number", "accused_name" |
| field_value | text | |
| confidence | float | |
| verified_by | uuid FK → users nullable | |

### `ledger_entries` (append-only, insert-only DB role)
| column | type | notes |
|---|---|---|
| id | bigserial PK | |
| document_id | uuid FK | |
| action | enum | UPLOAD, TRANSLATE, EXTRACT, VERIFY, VIEW, EDIT, APPROVE |
| actor_id | uuid FK → users | |
| timestamp | timestamp | |
| document_hash | text | |
| previous_entry_hash | text | |
| this_entry_hash | text | computed: SHA256(id+document_id+action+actor_id+timestamp+document_hash+previous_entry_hash) |
| signature | text | actor's digital signature over this_entry_hash |

### `ai_query_log`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| query_text | text | |
| retrieved_chunk_ids | text[] | |
| response_text | text | |
| timestamp | timestamp | |

---

## 5. API Endpoints

Base URL: `/api/v1`
All endpoints require a valid session (`Authorization: Bearer <JWT>`) except `/auth/*`. All responses logged for audit; write/verify/approve endpoints additionally create a `ledger_entries` row.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | OAuth2/SAML login, returns JWT (pre-MFA) |
| POST | `/auth/mfa/verify` | Verify OTP, returns full session JWT |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Current user + role + permissions |

### Cases
| Method | Endpoint | Description |
|---|---|---|
| GET | `/cases` | List cases visible to current user |
| POST | `/cases` | Create new case (Admin/Registrar) |
| GET | `/cases/{case_id}` | Case details (checks `case_access`) |
| POST | `/cases/{case_id}/access` | Grant access to a user (time-bound optional) |
| DELETE | `/cases/{case_id}/access/{user_id}` | Revoke access |

### Documents
| Method | Endpoint | Description |
|---|---|---|
| POST | `/cases/{case_id}/documents` | Upload document (multipart); triggers pipeline |
| GET | `/cases/{case_id}/documents` | List documents in case (permission-filtered) |
| GET | `/documents/{document_id}` | Document metadata + current version |
| GET | `/documents/{document_id}/versions` | Version history |
| GET | `/documents/{document_id}/file` | Download original file (signed URL, time-limited) |
| GET | `/documents/{document_id}/translation` | Translated version, if available |
| GET | `/documents/{document_id}/extracted-fields` | NER-extracted fields, pending or verified |
| POST | `/documents/{document_id}/verify` | Officer verifies/edits extracted fields → signs → unlocks for RAG |
| POST | `/documents/{document_id}/share` | Generate time-limited watermarked read-only link |

### Ledger / Audit
| Method | Endpoint | Description |
|---|---|---|
| GET | `/documents/{document_id}/ledger` | Full ledger history for a document |
| GET | `/ledger/verify-chain` | Walk entire chain, return integrity status (pass/fail + break point if any) |
| GET | `/cases/{case_id}/audit-report` | Exportable audit report for court/compliance |

### AI / RAG
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/query` | Submit natural-language question; returns cited response (access-filtered retrieval) |
| POST | `/ai/summarize/{document_id}` | Summarize a single verified document |
| POST | `/ai/timeline/{case_id}` | Generate structured case timeline (date, event, source doc ref) |
| GET | `/ai/query-log` | Retrieve past AI queries for a case (audit) |

### Collaboration
| Method | Endpoint | Description |
|---|---|---|
| POST | `/documents/{document_id}/comments` | Add annotation/comment |
| GET | `/documents/{document_id}/comments` | List comments |
| GET | `/cases/{case_id}/notifications` | Recent case activity feed |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users` | List/manage users (Admin only) |
| POST | `/admin/users/{user_id}/role` | Change user role |
| GET | `/admin/system-health` | Storage, ledger, AI service status |

---

## 6. Security Architecture

| Layer | Mechanism | Protects against |
|---|---|---|
| Transport | TLS | Network eavesdropping |
| Storage | AES-256 at rest | Physical/storage-level theft |
| Authentication | OAuth2/SAML + MFA | Identity spoofing, credential theft |
| Authorization | RBAC + case-level `case_access` | Unauthorized viewing across roles/cases |
| Integrity | SHA-256 hash-chain ledger | Silent/undetected tampering |
| Non-repudiation | Digital signatures on verify/approve actions | Denial of authorship, forged approvals |
| AI boundary | Self-hosted LLM, access-filtered RAG, schema-constrained extraction | Data exfiltration, confused-deputy retrieval, prompt injection |

**Four-point access check** on every request touching a document:
1. API gateway — valid session?
2. Case-level — is user in `case_access` for this case?
3. Document-level — does document's sensitivity match user clearance?
4. RAG retrieval — same case-level filter applied before chunks reach the LLM

**AI isolation:** The AI/NLP service runs in a separate, lower-trust zone with no direct write access to `documents` or `ledger_entries` — it only reads via the filtered retrieval API and writes back through the same verification-gated pipeline as any other actor.

---

## 7. Deployment

- Docker containers per service (backend, AI service, ledger service), orchestrated via Kubernetes
- Hosted on government-approved cloud (e.g., MeghRaj for India) or on-prem
- MinIO and PostgreSQL run within the same trusted network boundary — no public internet exposure
- CI/CD with signed container images; secrets managed via a vault (e.g., HashiCorp Vault), never in code/env files
