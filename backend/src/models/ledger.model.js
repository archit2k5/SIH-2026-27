import { query, withTransaction } from "../config/db.js";
import { computeLedgerHash, verifyChainIntegrity } from "../utils/crypto.js";
import { ALL_LEDGER_ACTIONS } from "../utils/constants.js";
import { Logger } from "../utils/logger.js";

export class LedgerModel {
    /**
     * Get the most recent global ledger entry to link the hash chain
     */
    static async getLatestEntry() {
        const sql = `SELECT * FROM ledger_entries ORDER BY id DESC LIMIT 1`;
        const result = await query(sql);
        return result.rows[0] || null;
    }

    /**
     * Appends an immutable entry to the cryptographic hash chain.
     * Computes the new hash linked to the previous entry and stores actor's digital signature.
     * 
     * @param {Object} params
     * @param {string} [params.documentId]
     * @param {string} params.action - One of LEDGER_ACTION
     * @param {string} params.actorId - User ID performing the action
     * @param {string} [params.documentHash] - SHA-256 of the document
     * @param {string} [params.signature] - Actor's digital signature over this_entry_hash
     * @param {Object} [params.metadata] - Additional contextual data (IP, browser, notes)
     */
    static async appendEntry({
        documentId = null,
        action,
        actorId,
        documentHash = "",
        signature = null,
        metadata = {},
    }) {
        if (!ALL_LEDGER_ACTIONS.includes(action)) {
            throw new Error(`Invalid ledger action: ${action}. Allowed: ${ALL_LEDGER_ACTIONS.join(", ")}`);
        }

        return await withTransaction(async (client) => {
            // 1. Get the latest entry to link against
            const lastRes = await client.query("SELECT id, this_entry_hash FROM ledger_entries ORDER BY id DESC LIMIT 1");
            const lastEntry = lastRes.rows[0];
            const previousEntryHash = lastEntry ? lastEntry.this_entry_hash : "GENESIS";

            // 2. Reserve next sequence value for ID
            const seqRes = await client.query("SELECT nextval('ledger_entries_id_seq') as next_id");
            const nextId = seqRes.rows[0].next_id;
            const timestamp = new Date();

            // 3. Compute this entry's cryptographic hash
            const thisEntryHash = computeLedgerHash({
                id: nextId,
                documentId,
                action,
                actorId,
                timestamp,
                documentHash,
                previousEntryHash,
            });

            // 4. Insert the record into the ledger
            const insertSql = `
                INSERT INTO ledger_entries (
                    id, document_id, action, actor_id, timestamp,
                    document_hash, previous_entry_hash, this_entry_hash,
                    signature, metadata
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const insertRes = await client.query(insertSql, [
                nextId,
                documentId,
                action,
                actorId,
                timestamp,
                documentHash,
                previousEntryHash,
                thisEntryHash,
                signature,
                JSON.stringify(metadata),
            ]);

            Logger.audit(action, {
                actorId,
                documentId,
                details: {
                    ledgerId: nextId,
                    thisHash: thisEntryHash,
                    prevHash: previousEntryHash
                }
            });

            return insertRes.rows[0];
        });
    }

    /**
     * Get all ledger entries for a specific document
     */
    static async getByDocumentId(documentId) {
        const sql = `
            SELECT le.*, u.name as actor_name, u.role as actor_role, u.public_key as actor_public_key
            FROM ledger_entries le
            LEFT JOIN users u ON le.actor_id = u.id
            WHERE le.document_id = $1
            ORDER BY le.id ASC
        `;
        const result = await query(sql, [documentId]);
        return result.rows;
    }

    /**
     * Retrieve the entire ledger chain (chronologically ordered)
     */
    static async getAllEntries() {
        const sql = `
            SELECT le.*, u.name as actor_name, u.role as actor_role, u.public_key as actor_public_key
            FROM ledger_entries le
            LEFT JOIN users u ON le.actor_id = u.id
            ORDER BY le.id ASC
        `;
        const result = await query(sql);
        return result.rows;
    }

    /**
     * Walks the entire hash-chain ledger to verify mathematical integrity.
     * Identifies any broken links, modified content, or invalid signatures.
     */
    static async verifyLedgerIntegrity() {
        const entries = await this.getAllEntries();
        
        // Build map of actor public keys for signature verification
        const publicKeys = new Map();
        for (const entry of entries) {
            if (entry.actor_id && entry.actor_public_key) {
                publicKeys.set(entry.actor_id, entry.actor_public_key);
            }
        }

        return verifyChainIntegrity(entries, publicKeys);
    }
}
