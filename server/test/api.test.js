import assert from "node:assert/strict";
import mongoose from "mongoose";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../src/app.js";
import { AdminBootstrap, User } from "../src/models.js";

let mongo;
let userToken;
let adminToken;
let userId;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  process.env.WEATHERAPI_KEY = "test-only-key";
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  delete process.env.WEATHERAPI_KEY;
});

test("Atmos API supports Postman workflows and expected error cases", async () => {
  const health = await request(app).get("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.database, "connected");

  assert.equal((await request(app).get("/api/auth/admin-bootstrap")).body.data.available, true);
  const invalidBootstrap = await request(app).post("/api/auth/admin-bootstrap").send({
    name: "API Test Admin",
    email: "admin@example.test",
    password: "short",
  });
  assert.equal(invalidBootstrap.status, 400);
  assert.equal((await request(app).get("/api/auth/admin-bootstrap")).body.data.available, true);

  const bootstrapAttempts = await Promise.all([
    request(app).post("/api/auth/admin-bootstrap").send({
      name: "API Test Admin",
      email: "admin@example.test",
      password: "test-only-password-12",
    }),
    request(app).post("/api/auth/admin-bootstrap").send({
      name: "Second Admin",
      email: "second-admin@example.test",
      password: "test-only-password-12",
    }),
  ]);
  const successfulBootstrap = bootstrapAttempts.find((result) => result.status === 201);
  assert.ok(successfulBootstrap, "exactly one initial admin must be created");
  assert.equal(bootstrapAttempts.filter((result) => result.status === 409).length, 1);
  assert.equal(successfulBootstrap.body.data.user.role, "admin");
  adminToken = successfulBootstrap.body.data.token;
  assert.equal((await request(app).get("/api/auth/admin-bootstrap")).body.data.available, false);
  assert.equal((await request(app).post("/api/auth/admin-bootstrap").send({
    name: "Third Admin",
    email: "third-admin@example.test",
    password: "test-only-password-12",
  })).status, 409);
  assert.equal((await User.countDocuments({ role: "admin" })), 1);
  assert.equal(await AdminBootstrap.countDocuments(), 1);

  const invalidRegistration = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email: "user@example.test",
    password: "short",
  });
  assert.equal(invalidRegistration.status, 400);

  const registration = await request(app).post("/api/auth/register").send({
    name: "API Test User",
    email: "user@example.test",
    password: "test-only-password-12",
  });
  assert.equal(registration.status, 201);
  userToken = registration.body.data.token;
  userId = registration.body.data.user.id;

  const login = await request(app).post("/api/auth/login").send({
    email: "user@example.test",
    password: "test-only-password-12",
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.user.role, "user");

  assert.equal((await request(app).get("/api/weather-records")).status, 401);
  assert.equal((await request(app).get("/api/admin/overview").set("Authorization", `Bearer ${userToken}`)).status, 403);
  for (const path of ["/api/weather-records", "/api/stations", "/api/forecasts", "/api/alerts"]) {
    assert.equal((await request(app).post(path).set({ Authorization: `Bearer ${userToken}` }).send({})).status, 403);
  }
  assert.equal((await request(app).get("/api/weather-records/000000000000000000000000").set("Authorization", `Bearer ${userToken}`)).status, 404);
  assert.equal((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${userToken}`)).status, 200);

  const priorFetch = globalThis.fetch;
  globalThis.fetch = async (url) => new Response(JSON.stringify({
    location: { name: new URL(url).searchParams.get("q") },
    current: { temp_c: 32 },
    forecast: { forecastday: [] },
  }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    for (const path of [
      "/api/weather/current?location=Pune",
      "/api/weather/forecast?location=Pune&days=3",
      "/api/weather/search?q=Pune",
    ]) {
      assert.equal((await request(app).get(path)).status, 200);
    }
    assert.equal((await request(app).get("/api/weather/forecast?location=Pune&days=99")).status, 400);
  } finally {
    globalThis.fetch = priorFetch;
  }

  const userProfile = await request(app).get("/api/users/me").set("Authorization", `Bearer ${userToken}`);
  assert.equal(userProfile.status, 200);
  assert.equal(userProfile.body.data.id, userId);
  assert.equal((await request(app).patch("/api/users/me").set("Authorization", `Bearer ${userToken}`).send({ name: "Updated API User" })).status, 200);

  const headers = { Authorization: `Bearer ${adminToken}` };
  assert.equal((await request(app).get("/api/weather-records").set(headers)).status, 200);
  const record = await request(app).post("/api/weather-records").set(headers).send({
    location: "Pune",
    recordedAt: "2026-10-20T12:00:00.000Z",
    source: "AWS-104",
    temperatureC: 39,
    riskLevel: "HIGH",
  });
  assert.equal(record.status, 201);
  const recordId = record.body.data._id;
  assert.equal((await request(app).get(`/api/weather-records/${recordId}`).set(headers)).status, 200);
  assert.equal((await request(app).patch(`/api/weather-records/${recordId}`).set(headers).send({ temperatureC: 40 })).status, 200);
  assert.equal((await request(app).delete(`/api/weather-records/${recordId}`).set(headers)).status, 204);
  assert.equal((await request(app).get(`/api/weather-records/${recordId}`).set(headers)).status, 404);

  const station = await request(app).post("/api/stations").set(headers).send({
    stationCode: "AWS-104",
    location: "Pune",
    status: "online",
    batteryPercent: 91,
    temperatureC: 39,
    humidityPct: 48,
  });
  assert.equal(station.status, 201);
  assert.equal((await request(app).get("/api/stations").set(headers)).status, 200);
  assert.equal((await request(app).get("/api/stations").set({ Authorization: `Bearer ${userToken}` })).body.data[0].temperatureC, 39);
  assert.equal((await request(app).get(`/api/stations/${station.body.data._id}`).set(headers)).status, 200);
  const stationUpdate = await request(app).patch(`/api/stations/${station.body.data._id}`).set(headers).send({ status: "maintenance", temperatureC: 40 });
  assert.equal(stationUpdate.status, 200);
  assert.equal(stationUpdate.body.data.temperatureC, 40);
  assert.equal((await request(app).delete(`/api/stations/${station.body.data._id}`).set(headers)).status, 204);

  const forecast = await request(app).post("/api/forecasts").set(headers).send({
    location: "Pune",
    forecastDate: "2026-10-21T00:00:00.000Z",
    maxTempC: 43,
    heatwaveProbability: 82,
    riskLevel: "HIGH",
    source: "Atmos model",
  });
  assert.equal(forecast.status, 201);
  assert.equal((await request(app).get("/api/forecasts").set(headers)).status, 200);
  assert.equal((await request(app).get(`/api/forecasts/${forecast.body.data._id}`).set(headers)).status, 200);
  assert.equal((await request(app).patch(`/api/forecasts/${forecast.body.data._id}`).set(headers).send({ maxTempC: 44 })).status, 200);
  assert.equal((await request(app).delete(`/api/forecasts/${forecast.body.data._id}`).set(headers)).status, 204);

  const alert = await request(app).post("/api/alerts").set(headers).send({
    location: "Pune",
    title: "Heat alert",
    message: "Take precautions during peak heat.",
    severity: "HIGH",
    startsAt: "2026-10-20T12:00:00.000Z",
  });
  assert.equal(alert.status, 201);
  assert.equal((await request(app).get("/api/alerts").set({ Authorization: `Bearer ${userToken}` })).body.data.length, 1);
  const unpublishedAlert = await request(app).post("/api/alerts").set(headers).send({
    location: "Pune",
    title: "Draft warning",
    message: "Admin draft only.",
    severity: "MODERATE",
    startsAt: "2026-10-20T12:00:00.000Z",
    status: "draft",
  });
  assert.equal(unpublishedAlert.status, 201);
  assert.equal((await request(app).get("/api/alerts").set({ Authorization: `Bearer ${userToken}` })).body.data.length, 1);
  assert.equal((await request(app).get("/api/alerts").set(headers)).status, 200);
  assert.equal((await request(app).get(`/api/alerts/${alert.body.data._id}`).set(headers)).status, 200);
  assert.equal((await request(app).patch(`/api/alerts/${alert.body.data._id}`).set(headers).send({ status: "expired" })).status, 200);
  assert.equal((await request(app).delete(`/api/alerts/${alert.body.data._id}`).set(headers)).status, 204);

  const approvedReport = await request(app).post("/api/discrepancies").set({ Authorization: `Bearer ${userToken}` }).send({
    location: "Pune",
    category: "temperature",
    description: "Station reading differs from the published record.",
    observedAt: "2026-10-20T12:00:00.000Z",
    proposedData: { temperatureC: 37 },
  });
  assert.equal(approvedReport.status, 201);
  assert.equal((await request(app).get("/api/discrepancies").set({ Authorization: `Bearer ${userToken}` })).body.data.length, 1);
  assert.equal((await request(app).get(`/api/discrepancies/${approvedReport.body.data._id}`).set({ Authorization: `Bearer ${userToken}` })).status, 200);
  const adminReports = await request(app).get("/api/discrepancies").set(headers);
  assert.equal(adminReports.status, 200);
  assert.equal(adminReports.body.data[0].submittedBy.email, "user@example.test");
  assert.equal((await request(app).post(`/api/discrepancies/${approvedReport.body.data._id}/approve`).set(headers).send({ reviewNote: "Verified." })).status, 200);

  const rejectedReport = await request(app).post("/api/discrepancies").set({ Authorization: `Bearer ${userToken}` }).send({
    location: "Mumbai",
    category: "station",
    description: "Station reported offline.",
    observedAt: "2026-10-20T12:00:00.000Z",
  });
  assert.equal(rejectedReport.status, 201);
  assert.equal((await request(app).post(`/api/discrepancies/${rejectedReport.body.data._id}/reject`).set(headers).send({ reviewNote: "No matching telemetry." })).status, 200);
  assert.equal((await request(app).post(`/api/discrepancies/${rejectedReport.body.data._id}/reject`).set(headers).send({})).status, 409);

  assert.equal((await request(app).get("/api/admin/overview").set(headers)).status, 200);
  assert.equal((await request(app).get("/api/admin/users").set(headers)).status, 200);
  assert.equal((await request(app).get("/api/admin/sessions").set(headers)).status, 200);
  assert.equal((await request(app).post("/api/auth/logout").set({ Authorization: `Bearer ${userToken}` })).status, 204);
  assert.equal((await request(app).get("/api/auth/me").set({ Authorization: `Bearer ${userToken}` })).status, 401);
  assert.equal((await request(app).patch(`/api/admin/users/${userId}`).set(headers).send({ active: false })).status, 200);
  assert.equal((await request(app).get("/api/auth/me").set({ Authorization: `Bearer ${userToken}` })).status, 401);
  assert.equal((await request(app).delete(`/api/admin/users/${userId}`).set(headers)).status, 204);

  assert.equal((await request(app).post("/api/auth/logout").set(headers)).status, 204);

  const disposable = await request(app).post("/api/auth/register").send({
    name: "Disposable API User",
    email: "disposable@example.test",
    password: "test-only-password-12",
  });
  const disposableToken = disposable.body.data.token;
  assert.equal((await request(app).delete("/api/users/me").set({ Authorization: `Bearer ${disposableToken}` })).status, 204);

  await mongoose.disconnect();
  assert.equal((await request(app).get("/api/health")).status, 503);
  await mongoose.connect(mongo.getUri());
});
