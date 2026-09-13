import { ApiError } from "../utils/api-error.js";

/**
 * Validates that required fields are present in req.body
 * @param  {...string} requiredFields 
 */
export function validateBody(...requiredFields) {
    return (req, res, next) => {
        const missing = [];
        for (const field of requiredFields) {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === "") {
                missing.push(field);
            }
        }

        if (missing.length > 0) {
            return next(new ApiError(400, `Missing required request body fields: ${missing.join(", ")}`));
        }

        next();
    };
}

/**
 * Validates UUID format in URL params or body
 * @param  {...string} paramNames 
 */
export function validateUUID(...paramNames) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return (req, res, next) => {
        for (const p of paramNames) {
            const val = req.params[p] || req.body[p];
            if (val && !uuidRegex.test(val)) {
                return next(new ApiError(400, `Invalid UUID format for parameter '${p}': ${val}`));
            }
        }
        next();
    };
}
