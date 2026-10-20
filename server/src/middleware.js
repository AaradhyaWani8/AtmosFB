import { findSessionUser } from "./auth.js";

export function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export function requireAuth(request, response, next) {
  const [scheme, token] = (request.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  findSessionUser(token).then((session) => {
    if (!session) {
      response.status(401).json({ error: "Invalid or expired session." });
      return;
    }
    request.user = session.user;
    request.token = token;
    next();
  }).catch(next);
}

export function requireAdmin(request, response, next) {
  if (request.user?.role !== "admin") {
    response.status(403).json({ error: "Administrator access required." });
    return;
  }
  next();
}

export function handleError(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error.name === "ValidationError" || error.name === "CastError" || (error instanceof SyntaxError && error.status === 400)) {
    response.status(400).json({ error: "Validation failed.", details: error.message });
    return;
  }
  if (error.code === 11000) {
    response.status(409).json({ error: "A record with that unique value already exists." });
    return;
  }
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  response.status(status).json({ error: status >= 500 ? "Internal server error." : error.message });
}
