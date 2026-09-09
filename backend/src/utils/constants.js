export const ROLES = Object.freeze({
    IO: "IO",
    PROSECUTOR: "Prosecutor",
    JUDGE: "Judge",
    FORENSIC_EXPERT: "Forensic Expert",
    REGISTRAR: "Registrar",
    ADMIN: "Admin",
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const CASE_STATUS = Object.freeze({
    OPEN: "open",
    UNDER_TRIAL: "under_trial",
    CLOSED: "closed",
});

export const ALL_CASE_STATUSES = Object.freeze(Object.values(CASE_STATUS));

export const ACCESS_LEVEL = Object.freeze({
    READ: "read",
    WRITE: "write",
    APPROVE: "approve",
});

export const ALL_ACCESS_LEVELS = Object.freeze(Object.values(ACCESS_LEVEL));

export const DOC_TYPE = Object.freeze({
    FIR: "FIR",
    CHARGESHEET: "chargesheet",
    WITNESS_STATEMENT: "witness_statement",
    FORENSIC_REPORT: "forensic_report",
    JUDGMENT: "judgment",
    OTHER: "other",
});

export const ALL_DOC_TYPES = Object.freeze(Object.values(DOC_TYPE));

export const LEDGER_ACTION = Object.freeze({
    UPLOAD: "UPLOAD",
    TRANSLATE: "TRANSLATE",
    EXTRACT: "EXTRACT",
    VERIFY: "VERIFY",
    VIEW: "VIEW",
    EDIT: "EDIT",
    APPROVE: "APPROVE",
    SHARE: "SHARE",
});

export const ALL_LEDGER_ACTIONS = Object.freeze(Object.values(LEDGER_ACTION));

export const SENSITIVITY_LEVEL = Object.freeze({
    PUBLIC: "public",
    RESTRICTED: "restricted",
    CONFIDENTIAL: "confidential",
    SECRET: "secret",
});

export const ALL_SENSITIVITY_LEVELS = Object.freeze(Object.values(SENSITIVITY_LEVEL));

export const ROLE_CLEARANCE = Object.freeze({
    [ROLES.REGISTRAR]: SENSITIVITY_LEVEL.RESTRICTED,
    [ROLES.IO]: SENSITIVITY_LEVEL.CONFIDENTIAL,
    [ROLES.FORENSIC_EXPERT]: SENSITIVITY_LEVEL.CONFIDENTIAL,
    [ROLES.PROSECUTOR]: SENSITIVITY_LEVEL.SECRET,
    [ROLES.JUDGE]: SENSITIVITY_LEVEL.SECRET,
    [ROLES.ADMIN]: SENSITIVITY_LEVEL.SECRET,
});

export const AI_CONSTANTS = Object.freeze({
    DISCLAIMER: "AI-assisted — pending human review",
    NO_DOC_FOUND: "No supporting verified document found in case records.",
    DEFAULT_EMBEDDING_DIM: 384,
    DEFAULT_MODEL: "llama3",
});

export const HTTP_STATUS = Object.freeze({
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
});
