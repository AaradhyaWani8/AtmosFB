import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const adminBootstrapSchema = new Schema({
  _id: { type: String, default: "initial-admin" },
  claimedAt: { type: Date, required: true, default: Date.now },
});

const weatherRecordSchema = new Schema({
  location: { type: String, required: true, trim: true },
  recordedAt: { type: Date, required: true },
  source: { type: String, required: true, trim: true },
  temperatureC: { type: Number, required: true },
  feelsLikeC: Number,
  humidityPct: { type: Number, min: 0, max: 100 },
  heatIndexC: Number,
  windKph: { type: Number, min: 0 },
  uvIndex: { type: Number, min: 0 },
  pressureHpa: Number,
  aqi: { type: Number, min: 0 },
  riskLevel: { type: String, enum: ["LOW", "MODERATE", "HIGH", "EXTREME"], required: true },
  notes: { type: String, maxlength: 2000 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const stationSchema = new Schema({
  stationCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
  location: { type: String, required: true, trim: true },
  status: { type: String, enum: ["online", "offline", "maintenance"], default: "online" },
  batteryPercent: { type: Number, min: 0, max: 100 },
  temperatureC: Number,
  feelsLikeC: Number,
  humidityPct: { type: Number, min: 0, max: 100 },
  heatIndexC: Number,
  windKph: { type: Number, min: 0 },
  uvIndex: { type: Number, min: 0 },
  pressureHpa: Number,
  aqi: { type: Number, min: 0 },
  solarStatus: { type: String, trim: true },
  lastSyncedAt: Date,
  validationStatus: { type: String, enum: ["verified", "pending", "flagged"], default: "pending" },
  notes: { type: String, maxlength: 2000 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const forecastSchema = new Schema({
  location: { type: String, required: true, trim: true },
  forecastDate: { type: Date, required: true },
  minTempC: Number,
  maxTempC: { type: Number, required: true },
  heatwaveProbability: { type: Number, min: 0, max: 100, required: true },
  confidence: { type: Number, min: 0, max: 100 },
  riskLevel: { type: String, enum: ["LOW", "MODERATE", "HIGH", "EXTREME"], required: true },
  source: { type: String, required: true, trim: true },
  notes: { type: String, maxlength: 2000 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const alertSchema = new Schema({
  location: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  severity: { type: String, enum: ["LOW", "MODERATE", "HIGH", "EXTREME"], required: true },
  startsAt: { type: Date, required: true },
  endsAt: Date,
  status: { type: String, enum: ["draft", "published", "expired"], default: "published" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const discrepancySchema = new Schema({
  location: { type: String, required: true, trim: true },
  weatherRecordId: { type: Schema.Types.ObjectId, ref: "WeatherRecord" },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  observedAt: { type: Date, required: true },
  proposedData: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewNote: { type: String, maxlength: 2000 },
  submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
}, { timestamps: true });

export const User = model("User", userSchema);
export const Session = model("Session", sessionSchema);
export const AdminBootstrap = model("AdminBootstrap", adminBootstrapSchema);
export const WeatherRecord = model("WeatherRecord", weatherRecordSchema);
export const WeatherStation = model("WeatherStation", stationSchema);
export const Forecast = model("Forecast", forecastSchema);
export const Alert = model("Alert", alertSchema);
export const DiscrepancyReport = model("DiscrepancyReport", discrepancySchema);
