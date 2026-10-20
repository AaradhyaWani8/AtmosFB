import { Router } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { asyncHandler, requireAdmin, requireAuth } from "./middleware.js";
import { revokeSession, issueSession, loginUser, registerUser } from "./auth.js";
import { AdminBootstrap, Alert, DiscrepancyReport, Forecast, Session, User, WeatherRecord, WeatherStation } from "./models.js";

export const router = Router();
const auth = [requireAuth];
const admin = [requireAuth, requireAdmin];
const objectId = /^[a-f\d]{24}$/i;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function requireText(value, field, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    fail(400, `${field} is required and must be at most ${max} characters.`);
  }
  return value.trim();
}

function requestBody(request) {
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
    fail(400, "A JSON request body is required.");
  }
  return request.body;
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    fail(400, "Password must be between 12 and 128 characters.");
  }
}

function checkId(id) {
  if (!objectId.test(id)) fail(400, "A valid record ID is required.");
}

function pageOptions(request) {
  const page = Math.max(1, Number.parseInt(request.query.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit || "20", 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function listRoute(Model, filters = []) {
  return asyncHandler(async (request, response) => {
    const { page, limit, skip } = pageOptions(request);
    const query = {};
    for (const field of filters) {
      if (typeof request.query[field] === "string" && request.query[field].trim()) {
        query[field] = field === "status" && Model === DiscrepancyReport
          ? request.query[field].trim().toLowerCase()
          : request.query[field].trim();
      }
    }
    const [items, total] = await Promise.all([
      Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Model.countDocuments(query),
    ]);
    response.json({ data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  });
}

function itemRoute(Model) {
  return asyncHandler(async (request, response) => {
    checkId(request.params.id);
    const item = await Model.findById(request.params.id);
    if (!item) fail(404, "Record not found.");
    response.json({ data: item });
  });
}

function createRoute(Model) {
  return asyncHandler(async (request, response) => {
    const item = await Model.create({
      ...requestBody(request),
      createdBy: request.user._id,
      updatedBy: request.user._id,
    });
    response.status(201).json({ data: item });
  });
}

function updateRoute(Model, allowedFields) {
  return asyncHandler(async (request, response) => {
    checkId(request.params.id);
    const body = requestBody(request);
    const updates = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key)),
    );
    updates.updatedBy = request.user._id;
    const item = await Model.findByIdAndUpdate(request.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!item) fail(404, "Record not found.");
    response.json({ data: item });
  });
}

function deleteRoute(Model) {
  return asyncHandler(async (request, response) => {
    checkId(request.params.id);
    const item = await Model.findByIdAndDelete(request.params.id);
    if (!item) fail(404, "Record not found.");
    response.status(204).end();
  });
}

async function weatherApi(path, query) {
  if (!process.env.WEATHERAPI_KEY) fail(503, "WeatherAPI integration is not configured on the server.");
  const url = new URL(`https://api.weatherapi.com/v1/${path}`);
  url.searchParams.set("key", process.env.WEATHERAPI_KEY);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
  try {
    const result = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await result.json();
    if (!result.ok) {
      const error = new Error(data.error?.message || "WeatherAPI request failed.");
      error.status = result.status === 400 ? 400 : 502;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.status) throw error;
    const upstreamError = new Error("WeatherAPI service is unavailable.");
    upstreamError.status = 502;
    throw upstreamError;
  }
}

router.get("/health", (request, response) => {
  const state = ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState];
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "degraded",
    service: "atmos-api",
    database: connected ? "connected" : state,
    timestamp: new Date().toISOString(),
  });
});

router.post("/auth/register", asyncHandler(async (request, response) => {
  const body = requestBody(request);
  const name = requireText(body.name, "name", 100);
  const email = requireText(body.email, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, "A valid email address is required.");
  validatePassword(body.password);
  const user = await registerUser({ name, email, password: body.password });
  const session = await issueSession(user);
  response.status(201).json({
    data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...session },
  });
}));

router.get("/auth/admin-bootstrap", asyncHandler(async (request, response) => {
  const [existingAdmin, claimed] = await Promise.all([
    User.exists({ role: "admin" }),
    AdminBootstrap.exists({ _id: "initial-admin" }),
  ]);
  response.json({ data: { available: !existingAdmin && !claimed } });
}));

router.post("/auth/admin-bootstrap", asyncHandler(async (request, response) => {
  const body = requestBody(request);
  const name = requireText(body.name, "name", 100);
  const email = requireText(body.email, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, "A valid email address is required.");
  validatePassword(body.password);

  if (await User.exists({ role: "admin" })) fail(409, "An administrator already exists. Ask an administrator to add accounts.");
  try {
    await AdminBootstrap.create({ _id: "initial-admin" });
  } catch (error) {
    if (error.code === 11000) fail(409, "Initial administrator setup has already been claimed.");
    throw error;
  }

  try {
    const user = await registerUser({ name, email, password: body.password });
    user.role = "admin";
    await user.save();
    const session = await issueSession(user);
    response.status(201).json({
      data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...session },
    });
  } catch (error) {
    await AdminBootstrap.deleteOne({ _id: "initial-admin" });
    throw error;
  }
}));

router.post("/auth/login", asyncHandler(async (request, response) => {
  const body = requestBody(request);
  const email = requireText(body.email, "email", 254).toLowerCase();
  const password = body.password;
  if (typeof password !== "string" || !password) fail(400, "password is required.");
  const user = await loginUser(email, password);
  if (!user) fail(401, "Email or password is incorrect.");
  const session = await issueSession(user);
  response.json({
    data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...session },
  });
}));

router.post("/auth/logout", ...auth, asyncHandler(async (request, response) => {
  await revokeSession(request.token);
  response.status(204).end();
}));

router.get("/auth/me", ...auth, (request, response) => {
  response.json({ data: { id: request.user.id, name: request.user.name, email: request.user.email, role: request.user.role } });
});

router.get("/users/me", ...auth, (request, response) => {
  response.json({ data: { id: request.user.id, name: request.user.name, email: request.user.email, role: request.user.role } });
});

router.patch("/users/me", ...auth, asyncHandler(async (request, response) => {
  const body = requestBody(request);
  const updates = {};
  if (body.name !== undefined) updates.name = requireText(body.name, "name", 100);
  if (body.email !== undefined) {
    updates.email = requireText(body.email, "email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) fail(400, "A valid email address is required.");
  }
  if (body.password !== undefined) {
    validatePassword(body.password);
    updates.passwordHash = await bcrypt.hash(body.password, 12);
    await Session.deleteMany({ userId: request.user._id });
  }
  const user = await User.findByIdAndUpdate(request.user._id, updates, { new: true, runValidators: true });
  response.json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

router.delete("/users/me", ...auth, asyncHandler(async (request, response) => {
  await Promise.all([
    User.findByIdAndDelete(request.user._id),
    Session.deleteMany({ userId: request.user._id }),
  ]);
  response.status(204).end();
}));

router.get("/weather/current", asyncHandler(async (request, response) => {
  const location = requireText(request.query.location, "location", 120);
  response.json({ data: await weatherApi("current.json", { q: location, aqi: "yes" }) });
}));

router.get("/weather/forecast", asyncHandler(async (request, response) => {
  const location = requireText(request.query.location, "location", 120);
  const days = Number.parseInt(request.query.days || "3", 10);
  if (!Number.isInteger(days) || days < 1 || days > 10) fail(400, "days must be an integer from 1 to 10.");
  response.json({ data: await weatherApi("forecast.json", { q: location, days, aqi: "yes", alerts: "yes" }) });
}));

router.get("/weather/search", asyncHandler(async (request, response) => {
  const query = requireText(request.query.q, "q", 120);
  response.json({ data: await weatherApi("search.json", { q: query }) });
}));

router.get("/weather-records", ...auth, listRoute(WeatherRecord, ["location", "riskLevel"]));
router.get("/weather-records/:id", ...auth, itemRoute(WeatherRecord));
router.post("/weather-records", ...admin, createRoute(WeatherRecord));
router.patch("/weather-records/:id", ...admin, updateRoute(WeatherRecord, [
  "location", "recordedAt", "source", "temperatureC", "feelsLikeC", "humidityPct",
  "heatIndexC", "windKph", "uvIndex", "pressureHpa", "aqi", "riskLevel", "notes",
]));
router.delete("/weather-records/:id", ...admin, deleteRoute(WeatherRecord));

router.get("/stations", ...auth, listRoute(WeatherStation, ["location", "status"]));
router.get("/stations/:id", ...auth, itemRoute(WeatherStation));
router.post("/stations", ...admin, createRoute(WeatherStation));
router.patch("/stations/:id", ...admin, updateRoute(WeatherStation, [
  "stationCode", "location", "status", "batteryPercent", "temperatureC", "feelsLikeC", "humidityPct",
  "heatIndexC", "windKph", "uvIndex", "pressureHpa", "aqi", "solarStatus", "lastSyncedAt",
  "validationStatus", "notes",
]));
router.delete("/stations/:id", ...admin, deleteRoute(WeatherStation));

router.get("/forecasts", ...auth, listRoute(Forecast, ["location", "riskLevel"]));
router.get("/forecasts/:id", ...auth, itemRoute(Forecast));
router.post("/forecasts", ...admin, createRoute(Forecast));
router.patch("/forecasts/:id", ...admin, updateRoute(Forecast, [
  "location", "forecastDate", "minTempC", "maxTempC", "heatwaveProbability", "confidence", "riskLevel", "source", "notes",
]));
router.delete("/forecasts/:id", ...admin, deleteRoute(Forecast));

router.get("/alerts", ...auth, asyncHandler(async (request, response) => {
  const query = {};
  if (request.query.location) query.location = String(request.query.location).trim();
  if (request.query.severity) query.severity = String(request.query.severity).trim().toUpperCase();
  if (request.user.role !== "admin") query.status = "published";
  else if (request.query.status) query.status = String(request.query.status).trim().toLowerCase();
  const { page, limit, skip } = pageOptions(request);
  const [data, total] = await Promise.all([
    Alert.find(query).sort({ startsAt: -1 }).skip(skip).limit(limit),
    Alert.countDocuments(query),
  ]);
  response.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
router.get("/alerts/:id", ...auth, itemRoute(Alert));
router.post("/alerts", ...admin, createRoute(Alert));
router.patch("/alerts/:id", ...admin, updateRoute(Alert, [
  "location", "title", "message", "severity", "startsAt", "endsAt", "status",
]));
router.delete("/alerts/:id", ...admin, deleteRoute(Alert));

router.post("/discrepancies", ...auth, asyncHandler(async (request, response) => {
  const body = requestBody(request);
  const report = await DiscrepancyReport.create({
    location: requireText(body.location, "location", 120),
    category: requireText(body.category, "category", 100),
    description: requireText(body.description, "description", 4000),
    observedAt: body.observedAt,
    weatherRecordId: body.weatherRecordId || undefined,
    proposedData: body.proposedData || {},
    submittedBy: request.user._id,
  });
  response.status(201).json({ data: report });
}));

router.get("/discrepancies", ...auth, asyncHandler(async (request, response) => {
  const query = request.user.role === "admin" ? {} : { submittedBy: request.user._id };
  if (request.query.status) query.status = String(request.query.status).toLowerCase();
  const { page, limit, skip } = pageOptions(request);
  const [data, total] = await Promise.all([
    DiscrepancyReport.find(query).populate("submittedBy", "name email").populate("reviewedBy", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    DiscrepancyReport.countDocuments(query),
  ]);
  response.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get("/discrepancies/:id", ...auth, asyncHandler(async (request, response) => {
  checkId(request.params.id);
  const report = await DiscrepancyReport.findById(request.params.id).populate("submittedBy", "name email").populate("reviewedBy", "name email");
  if (!report) fail(404, "Report not found.");
  const submitterId = report.submittedBy?._id || report.submittedBy;
  if (request.user.role !== "admin" && String(submitterId) !== String(request.user._id)) fail(403, "You cannot view this report.");
  response.json({ data: report });
}));

async function reviewReport(request, response, status) {
  checkId(request.params.id);
  const body = requestBody(request);
  const report = await DiscrepancyReport.findOneAndUpdate(
    { _id: request.params.id, status: "pending" },
    { status, reviewNote: body.reviewNote || "", reviewedBy: request.user._id, reviewedAt: new Date() },
    { new: true, runValidators: true },
  );
  if (!report) {
    const exists = await DiscrepancyReport.exists({ _id: request.params.id });
    if (!exists) fail(404, "Report not found.");
    fail(409, "Only pending reports can be reviewed.");
  }
  response.json({ data: report });
}

router.post("/discrepancies/:id/approve", ...admin, asyncHandler((request, response) => reviewReport(request, response, "approved")));
router.post("/discrepancies/:id/reject", ...admin, asyncHandler((request, response) => reviewReport(request, response, "rejected")));

router.get("/admin/overview", ...admin, asyncHandler(async (request, response) => {
  const [users, weatherRecords, stations, forecasts, alerts, pendingDiscrepancies] = await Promise.all([
    User.countDocuments(),
    WeatherRecord.countDocuments(),
    WeatherStation.countDocuments(),
    Forecast.countDocuments(),
    Alert.countDocuments(),
    DiscrepancyReport.countDocuments({ status: "pending" }),
  ]);
  response.json({ data: { users, weatherRecords, stations, forecasts, alerts, pendingDiscrepancies } });
}));

router.get("/admin/users", ...admin, asyncHandler(async (request, response) => {
  const { page, limit, skip } = pageOptions(request);
  const [data, total] = await Promise.all([
    User.find().select("name email role active createdAt").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);
  response.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.patch("/admin/users/:id", ...admin, asyncHandler(async (request, response) => {
  checkId(request.params.id);
  const body = requestBody(request);
  const updates = {};
  if (body.role !== undefined) {
    if (!["user", "admin"].includes(body.role)) fail(400, "role must be user or admin.");
    updates.role = body.role;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") fail(400, "active must be a boolean.");
    updates.active = body.active;
  }
  const user = await User.findByIdAndUpdate(request.params.id, updates, { new: true, runValidators: true })
    .select("name email role active createdAt");
  if (!user) fail(404, "User not found.");
  if (!user.active) await Session.deleteMany({ userId: user._id });
  response.json({ data: user });
}));

router.delete("/admin/users/:id", ...admin, asyncHandler(async (request, response) => {
  checkId(request.params.id);
  if (String(request.params.id) === String(request.user._id)) fail(400, "Administrators cannot delete their own account.");
  const user = await User.findByIdAndDelete(request.params.id);
  if (!user) fail(404, "User not found.");
  await Session.deleteMany({ userId: user._id });
  response.status(204).end();
}));

router.get("/admin/sessions", ...admin, asyncHandler(async (request, response) => {
  const count = await Session.countDocuments({ expiresAt: { $gt: new Date() } });
  response.json({ data: { activeSessions: count } });
}));
