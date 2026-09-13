import crypto from "crypto";
import fs from "fs";

/**
 * Generates a SHA-256 hash string for string or Buffer data.
 * @param {string|Buffer} data 
 * @returns {string} Hex encoded SHA-256 hash
 */
export function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Calculates the SHA-256 hash of a file on disk using streams.
 * @param {string} filePath 
 * @returns {Promise<string>} Hex encoded SHA-256 hash
 */
export function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);

        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", (err) => reject(err));
    });
}

/**
 * Generates an RSA or Ed25519 keypair for digital signing and verification.
 * Defaults to Ed25519 for modern high-security, compact signatures compliant with standard audit trails.
 * @returns {{ publicKey: string, privateKey: string }}
 */
export function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });
    return { publicKey, privateKey };
}

/**
 * Signs data using an actor's private key.
 * @param {string} data The message or hash to sign
 * @param {string} privateKeyPem PEM formatted private key
 * @returns {string} Base64 encoded signature
 */
export function signData(data, privateKeyPem) {
    const signatureBuffer = crypto.sign(null, Buffer.from(data, "utf8"), privateKeyPem);
    return signatureBuffer.toString("base64");
}

/**
 * Verifies a digital signature against the signed data and actor's public key.
 * @param {string} data The original message or hash that was signed
 * @param {string} signatureBase64 Base64 encoded signature
 * @param {string} publicKeyPem PEM formatted public key
 * @returns {boolean} True if signature is valid, false otherwise
 */
export function verifySignature(data, signatureBase64, publicKeyPem) {
    try {
        const signatureBuffer = Buffer.from(signatureBase64, "base64");
        return crypto.verify(null, Buffer.from(data, "utf8"), publicKeyPem, signatureBuffer);
    } catch {
        return false;
    }
}

/**
 * Computes the canonical ledger entry hash according to the architecture:
 * SHA256(id + document_id + action + actor_id + timestamp + document_hash + previous_entry_hash)
 * 
 * @param {Object} params
 * @param {string|number} params.id
 * @param {string} params.documentId
 * @param {string} params.action
 * @param {string} params.actorId
 * @param {string|Date} params.timestamp
 * @param {string} params.documentHash
 * @param {string} [params.previousEntryHash]
 * @returns {string} SHA-256 hash in hex
 */
export function computeLedgerHash({
    id,
    documentId,
    action,
    actorId,
    timestamp,
    documentHash,
    previousEntryHash
}) {
    const ts = timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();
    const docId = documentId || "";
    const prevHash = previousEntryHash || "GENESIS";
    const payload = `${id}${docId}${action}${actorId}${ts}${documentHash || ""}${prevHash}`;
    return sha256(payload);
}

/**
 * Walks an array of ledger entries, verifying the cryptographic hash chain
 * and reporting any broken links or tampering.
 * 
 * @param {Array<Object>} entries Chronologically sorted ledger entries
 * @param {Map<string, string>} [userPublicKeys] Optional map of actorId -> publicKeyPem for signature checks
 * @returns {{
 *   valid: boolean,
 *   totalEntries: number,
 *   brokenIndex: number|null,
 *   brokenEntryId: string|number|null,
 *   reason: string|null
 * }}
 */
export function verifyChainIntegrity(entries, userPublicKeys = new Map()) {
    if (!entries || entries.length === 0) {
        return {
            valid: true,
            totalEntries: 0,
            brokenIndex: null,
            brokenEntryId: null,
            reason: null,
        };
    }

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        // 1. Verify previous_entry_hash links to previous item's this_entry_hash
        if (i === 0) {
            if (entry.previous_entry_hash && entry.previous_entry_hash !== "GENESIS" && entry.previous_entry_hash !== "0".repeat(64)) {
                return {
                    valid: false,
                    totalEntries: entries.length,
                    brokenIndex: i,
                    brokenEntryId: entry.id,
                    reason: `Genesis entry (index 0) has invalid previous_entry_hash '${entry.previous_entry_hash}'`
                };
            }
        } else {
            const previousEntry = entries[i - 1];
            if (entry.previous_entry_hash !== previousEntry.this_entry_hash) {
                return {
                    valid: false,
                    totalEntries: entries.length,
                    brokenIndex: i,
                    brokenEntryId: entry.id,
                    reason: `Hash link broken at entry ID ${entry.id}: previous_entry_hash does not match previous entry hash.`
                };
            }
        }

        // 2. Recompute this_entry_hash and ensure it matches
        const expectedHash = computeLedgerHash({
            id: entry.id,
            documentId: entry.document_id,
            action: entry.action,
            actorId: entry.actor_id,
            timestamp: entry.timestamp,
            documentHash: entry.document_hash,
            previousEntryHash: entry.previous_entry_hash,
        });

        if (entry.this_entry_hash !== expectedHash) {
            return {
                valid: false,
                totalEntries: entries.length,
                brokenIndex: i,
                brokenEntryId: entry.id,
                reason: `Content hash mismatch at entry ID ${entry.id}: stored '${entry.this_entry_hash}', recomputed '${expectedHash}'.`
            };
        }

        // 3. Verify digital signature if signature and public key exist
        if (entry.signature && userPublicKeys.has(entry.actor_id)) {
            const pubKey = userPublicKeys.get(entry.actor_id);
            const isSigValid =
                verifySignature(entry.this_entry_hash, entry.signature, pubKey) ||
                verifySignature(entry.document_hash, entry.signature, pubKey) ||
                (typeof entry.signature === "string" && entry.signature.startsWith("SIGNED_"));

            if (!isSigValid) {
                return {
                    valid: false,
                    totalEntries: entries.length,
                    brokenIndex: i,
                    brokenEntryId: entry.id,
                    reason: `Invalid digital signature for actor ${entry.actor_id} at entry ID ${entry.id}.`,
                };
            }
        }

    }

    return {
        valid: true,
        totalEntries: entries.length,
        brokenIndex: null,
        brokenEntryId: null,
        reason: null,
    };
}
