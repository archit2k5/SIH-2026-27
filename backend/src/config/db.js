import pg from "pg";
import { newDb, DataType } from "pg-mem";
import crypto from "crypto";
import { ENV } from "./env.js";
import { Logger } from "../utils/logger.js";

const { Pool: PgPool } = pg;

// Default PostgreSQL Connection Pool configuration
const poolConfig = ENV.DATABASE_URL
    ? { connectionString: ENV.DATABASE_URL }
    : {
        host: ENV.DB_HOST,
        port: ENV.DB_PORT,
        user: ENV.DB_USER,
        password: ENV.DB_PASSWORD,
        database: ENV.DB_NAME,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
    };

let activePool = new PgPool(poolConfig);
let isInMemoryMode = false;

activePool.on("error", (err) => {
    if (!isInMemoryMode) {
        Logger.error("PostgreSQL client error", err);
    }
});

/**
 * Creates an in-memory PostgreSQL database instance using pg-mem
 * Used as automatic fallback when PostgreSQL daemon is not running locally.
 */
function createInMemoryPool() {
    Logger.info("Initializing in-memory PostgreSQL emulator (pg-mem)...");
    const memDb = newDb();

    memDb.public.registerFunction({
        name: "uuid_generate_v4",
        returns: DataType.text,
        impure: true,
        implementation: () => crypto.randomUUID(),
    });

    memDb.public.registerFunction({
        name: "now",
        returns: DataType.timestamp,
        impure: true,
        implementation: () => new Date(),
    });


    const { Pool: MemPool } = memDb.adapters.createPg();
    return new MemPool();
}

/**
 * Proxy pool object to allow seamless fallback between real PostgreSQL and in-memory emulator
 */
export const pool = {
    query: (text, params) => activePool.query(text, params),
    connect: () => activePool.connect(),
    end: () => activePool.end(),
    on: (event, handler) => activePool.on(event, handler),
};

/**
 * Execute a SQL query with parameters and execution time tracking
 * @param {string} text 
 * @param {Array<any>} params 
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params = []) {
    const start = Date.now();
    try {
        const res = await activePool.query(text, params);
        const duration = Date.now() - start;
        if (ENV.NODE_ENV === "development") {
            Logger.info(`SQL executed (${duration}ms): ${text.replace(/\s+/g, " ").trim().slice(0, 100)}`);
        }
        return res;
    } catch (error) {
        Logger.error(`SQL Query failed: ${text.replace(/\s+/g, " ").trim().slice(0, 150)}`, error);
        throw error;
    }
}

/**
 * Transaction helper for atomic operations
 * @param {function(pg.PoolClient): Promise<any>} callback 
 * @returns {Promise<any>}
 */
export async function withTransaction(callback) {
    const client = await activePool.connect();
    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Initializes database schemas, types, tables, and indexes idempotently.
 */
export async function initDb() {
    try {
        // Test connection to PostgreSQL
        await activePool.query("SELECT 1");
        Logger.info("Connected to PostgreSQL database successfully.");
    } catch (connErr) {
        Logger.warn(
            `PostgreSQL connection failed (${connErr.message}). Switching to in-memory PostgreSQL engine for seamless operation.`
        );
        isInMemoryMode = true;
        activePool = createInMemoryPool();
    }

    if (isInMemoryMode) {
        Logger.info("Initializing in-memory PostgreSQL schema...");
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'IO',
                public_key TEXT,
                mfa_enabled BOOLEAN DEFAULT FALSE,
                mfa_secret TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                case_number TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                created_by TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS case_access (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                case_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                access_level TEXT NOT NULL DEFAULT 'read',
                expires_at TIMESTAMPTZ,
                granted_by TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT unique_case_user UNIQUE (case_id, user_id)
            );`,
            `CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                case_id TEXT NOT NULL,
                doc_type TEXT NOT NULL DEFAULT 'other',
                title TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                original_hash TEXT NOT NULL,
                language TEXT DEFAULT 'en',
                sensitivity TEXT DEFAULT 'public',
                verified BOOLEAN DEFAULT FALSE,
                current_version INT DEFAULT 1,
                uploaded_by TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS document_versions (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                document_id TEXT NOT NULL,
                version_number INT NOT NULL,
                storage_path TEXT NOT NULL,
                hash TEXT NOT NULL,
                created_by TEXT,
                change_summary TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT unique_doc_ver UNIQUE (document_id, version_number)
            );`,
            `CREATE TABLE IF NOT EXISTS extracted_fields (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                document_id TEXT NOT NULL,
                field_name TEXT NOT NULL,
                field_value TEXT NOT NULL,
                confidence REAL DEFAULT 1.0,
                verified_by TEXT,
                is_verified BOOLEAN DEFAULT FALSE,
                verified_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS ledger_entries (
                id SERIAL PRIMARY KEY,
                document_id TEXT,
                action TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                document_hash TEXT,
                previous_entry_hash TEXT,
                this_entry_hash TEXT NOT NULL,
                signature TEXT,
                metadata JSONB DEFAULT '{}'::jsonb
            );`,
            `CREATE TABLE IF NOT EXISTS ai_query_log (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id TEXT NOT NULL,
                case_id TEXT,
                query_text TEXT NOT NULL,
                retrieved_chunk_ids TEXT[] DEFAULT '{}',
                response_text TEXT,
                citations JSONB DEFAULT '[]'::jsonb,
                timestamp TIMESTAMPTZ DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                document_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id TEXT NOT NULL,
                case_id TEXT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS document_shares (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                document_id TEXT NOT NULL,
                share_token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                created_by TEXT NOT NULL,
                access_count INT DEFAULT 0,
                watermark_text TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );`,
            `CREATE TABLE IF NOT EXISTS document_chunks (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
                document_id TEXT NOT NULL,
                case_id TEXT NOT NULL,
                chunk_index INT NOT NULL,
                chunk_text TEXT NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );`,
        ];

        for (const sql of tables) {
            await activePool.query(sql);
        }
        Logger.info("In-memory PostgreSQL schema initialized successfully.");
        return;
    }

    // Real PostgreSQL DDL initialization
    Logger.info("Initializing PostgreSQL schema and tables...");

    const ddl = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('IO', 'Prosecutor', 'Judge', 'Forensic Expert', 'Registrar', 'Admin');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
        CREATE TYPE case_status AS ENUM ('open', 'under_trial', 'closed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
        CREATE TYPE case_access_level AS ENUM ('read', 'write', 'approve');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
        CREATE TYPE document_type AS ENUM ('FIR', 'chargesheet', 'witness_statement', 'forensic_report', 'judgment', 'other');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
        CREATE TYPE ledger_action AS ENUM ('UPLOAD', 'TRANSLATE', 'EXTRACT', 'VERIFY', 'VIEW', 'EDIT', 'APPROVE', 'SHARE');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'IO',
        public_key TEXT,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_secret TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        case_number TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status case_status NOT NULL DEFAULT 'open',
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS case_access (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_level case_access_level NOT NULL DEFAULT 'read',
        expires_at TIMESTAMPTZ,
        granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_case_user_access UNIQUE (case_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        doc_type document_type NOT NULL DEFAULT 'other',
        title TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        original_hash TEXT NOT NULL,
        language TEXT DEFAULT 'en',
        sensitivity TEXT DEFAULT 'public',
        verified BOOLEAN DEFAULT FALSE,
        current_version INT DEFAULT 1,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        storage_path TEXT NOT NULL,
        hash TEXT NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        change_summary TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
    );

    CREATE TABLE IF NOT EXISTS extracted_fields (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        field_name TEXT NOT NULL,
        field_value TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
        id BIGSERIAL PRIMARY KEY,
        document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
        action ledger_action NOT NULL,
        actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        document_hash TEXT,
        previous_entry_hash TEXT,
        this_entry_hash TEXT NOT NULL,
        signature TEXT,
        metadata JSONB DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS ai_query_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
        query_text TEXT NOT NULL,
        retrieved_chunk_ids TEXT[] DEFAULT '{}',
        response_text TEXT,
        citations JSONB DEFAULT '[]'::jsonb,
        timestamp TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS document_shares (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        share_token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_count INT DEFAULT 0,
        watermark_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    DO $$ BEGIN
        CREATE EXTENSION IF NOT EXISTS vector;
    EXCEPTION WHEN OTHERS THEN null; END $$;

    CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        chunk_index INT NOT NULL,
        chunk_text TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
    CREATE INDEX IF NOT EXISTS idx_case_access_user ON case_access(user_id, case_id);
    CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(case_id);
    CREATE INDEX IF NOT EXISTS idx_documents_original_hash ON documents(original_hash);
    CREATE INDEX IF NOT EXISTS idx_ledger_document ON ledger_entries(document_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_this_hash ON ledger_entries(this_entry_hash);
    CREATE INDEX IF NOT EXISTS idx_extracted_document ON extracted_fields(document_id);
    CREATE INDEX IF NOT EXISTS idx_shares_token ON document_shares(share_token);
    CREATE INDEX IF NOT EXISTS idx_chunks_doc_case ON document_chunks(case_id, document_id);
    `;

    await activePool.query(ddl);
    Logger.info("Database schema and tables initialized successfully.");
}
