import { ApiError } from "../utils/api-error.js";
import { ROLES } from "../utils/constants.js";

/**
 * Middleware factory to authorize specific roles
 * @param  {...string} allowedRoles 
 */
export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, "Unauthorized: No active session."));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new ApiError(
                    403,
                    `Access forbidden: Role '${req.user.role}' does not have sufficient clearance. Allowed roles: ${allowedRoles.join(", ")}`
                )
            );
        }

        next();
    };
}

/**
 * Requires Admin role
 */
export const requireAdmin = authorizeRoles(ROLES.ADMIN);

/**
 * Requires Admin or Registrar role (e.g. for case creation, user assignment)
 */
export const requireAdminOrRegistrar = authorizeRoles(ROLES.ADMIN, ROLES.REGISTRAR);

/**
 * Requires Officer verification clearance (IO, Prosecutor, Judge, Registrar, Admin)
 */
export const requireVerificationClearance = authorizeRoles(
    ROLES.IO,
    ROLES.PROSECUTOR,
    ROLES.JUDGE,
    ROLES.REGISTRAR,
    ROLES.ADMIN
);
