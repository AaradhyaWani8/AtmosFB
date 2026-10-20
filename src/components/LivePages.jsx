import { useCallback, useEffect, useState } from "react";
import { Droplets, MapPin, Thermometer, Wind, Sun, Plus, Pencil, X } from "lucide-react";
import { C, LOCATION_DATA, MODEL_METADATA, RISK } from "../data/climateData";
import { apiRequest } from "../services/http";
import { Button, Card, Eyebrow, RiskIndicator, SectionHeading } from "./ui";

const inputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.charcoal, font: "inherit" };
const labelStyle = { display: "grid", gap: 5, fontSize: 12, color: C.textMuted };
const numeric = (value) => value === "" || value === undefined ? undefined : Number(value);
const localDate = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const displayValue = (value, suffix = "") => value === undefined || value === null ? "—" : `${value}${suffix}`;

export function Dashboard({ location, setPage }) {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => apiRequest(`/weather/current?location=${encodeURIComponent(location)}`)
      .then((result) => { if (active) { setWeather({ requestedLocation: location, result }); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
    load();
    const interval = window.setInterval(load, 300000);
    return () => { active = false; window.clearInterval(interval); };
  }, [location]);

  const loading = weather?.requestedLocation !== location && !error;
  const current = weather?.requestedLocation === location ? weather.result.current : null;
  const currentLocation = weather?.requestedLocation === location ? weather.result.location : null;
  const values = [
    ["Feels like", displayValue(current?.feelslike_c, "°C"), Thermometer],
    ["Humidity", displayValue(current?.humidity, "%"), Droplets],
    ["Wind", displayValue(current?.wind_kph, " km/h"), Wind],
    ["UV index", displayValue(current?.uv), Sun],
    ["Heat index", displayValue(current?.heatindex_c, "°C"), Thermometer],
    ["Pressure", displayValue(current?.pressure_mb, " hPa"), Thermometer],
    ["Air quality", displayValue(current?.air_quality?.["us-epa-index"]), Wind],
  ];

  return <div>
    <div style={{ marginBottom: 26 }}>
      <Eyebrow>Climate Intelligence</Eyebrow>
      <h1 style={{ fontWeight: 400, fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: -0.5, margin: 0, color: C.charcoal }}>Live weather overview</h1>
      <p style={{ color: C.textMuted, fontSize: 14.5, marginTop: 10 }}>Current conditions for {location}, fetched live from WeatherAPI.com.</p>
    </div>
    <Card style={{ marginBottom: 16, background: C.station }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <Eyebrow>Real-time conditions</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.textMuted, fontSize: 13 }}><MapPin size={14} />{currentLocation ? `${currentLocation.name}, ${currentLocation.region}` : location}</div>
          <div style={{ fontSize: 52, fontWeight: 500, letterSpacing: -2, marginTop: 10 }}>{loading ? "…" : displayValue(current?.temp_c, "°C")}</div>
          <div style={{ color: C.textMuted, fontSize: 13 }}>{current?.condition?.text || (loading ? "Fetching current conditions…" : "Current temperature")}</div>
        </div>
        {current?.condition?.icon && <img src={`https:${current.condition.icon}`} alt={current.condition.text || "Weather"} width="72" height="72" />}
        <div style={{ fontSize: 12, color: C.textFaint }}>Updated {current?.last_updated || "—"}</div>
      </div>
      {error && <p role="alert" style={{ color: "#A73A2F", marginBottom: 0 }}>Live weather unavailable: {error}</p>}
    </Card>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
      {values.map(([label, value, Icon]) => <Card key={label} style={{ padding: 18 }}><Icon size={16} color={C.textMuted} /><div style={{ color: C.textMuted, fontSize: 12, marginTop: 10 }}>{label}</div><strong style={{ display: "block", fontSize: 21, marginTop: 4 }}>{loading ? "…" : value}</strong></Card>)}
    </div>
    <Card style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
      <div><div style={{ fontWeight: 600 }}>Need more detail?</div><div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>View station telemetry, forecasts, and active warnings.</div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button small icon={null} onClick={() => setPage("monitoring")}>Station monitoring</Button><Button small variant="secondary" icon={null} onClick={() => setPage("prediction")}>5-day forecast</Button></div>
    </Card>
  </div>;
}

const emptyStation = (location) => ({
  stationCode: "",
  location,
  status: "online",
  batteryPercent: "",
  temperatureC: "",
  feelsLikeC: "",
  humidityPct: "",
  heatIndexC: "",
  windKph: "",
  uvIndex: "",
  pressureHpa: "",
  aqi: "",
  solarStatus: "",
  validationStatus: "pending",
});

export function Monitoring({ location, user }) {
  const [stations, setStations] = useState([]);
  const [draft, setDraft] = useState(() => emptyStation(location));
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = user.role === "admin";

  const refresh = useCallback(async () => {
    try {
      const result = await apiRequest(`/stations?location=${encodeURIComponent(location)}&limit=100`);
      if (!Array.isArray(result)) throw new Error("The API returned an invalid station list.");
      setStations(result);
      setError("");
    } catch (requestError) { setError(requestError.message); }
  }, [location]);

  useEffect(() => {
    let active = true;
    const load = () => apiRequest(`/stations?location=${encodeURIComponent(location)}&limit=100`)
      .then((result) => {
        if (!Array.isArray(result)) throw new Error("The API returned an invalid station list.");
        if (active) { setStations(result); setError(""); }
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    load();
    const interval = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [location]);
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = { ...draft };
    for (const field of ["batteryPercent", "temperatureC", "feelsLikeC", "humidityPct", "heatIndexC", "windKph", "uvIndex", "pressureHpa", "aqi"]) body[field] = numeric(body[field]);
    for (const field of Object.keys(body)) if (body[field] === undefined) delete body[field];
    try {
      await apiRequest(editingId ? `/stations/${editingId}` : "/stations", { method: editingId ? "PATCH" : "POST", body });
      setShowForm(false);
      setEditingId("");
      setDraft(emptyStation(location));
      await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const edit = (station) => {
    setDraft(Object.fromEntries(Object.entries({ ...emptyStation(location), ...station }).map(([key, value]) => [key, value ?? ""])));
    setEditingId(station._id);
    setShowForm(true);
  };

  const fields = [["stationCode", "Station code", "text"], ["location", "Location", "text"], ["status", "Status", "select"], ["temperatureC", "Temperature °C", "number"], ["feelsLikeC", "Feels like °C", "number"], ["humidityPct", "Humidity %", "number"], ["heatIndexC", "Heat index °C", "number"], ["windKph", "Wind km/h", "number"], ["uvIndex", "UV index", "number"], ["pressureHpa", "Pressure hPa", "number"], ["aqi", "Air quality index", "number"], ["batteryPercent", "Battery %", "number"], ["solarStatus", "Solar status", "text"], ["validationStatus", "Validation", "select"]];

  return <div>
    <SectionHeading eyebrow="Station telemetry" title="Station monitoring" sub={`Weather station readings for ${location}. Admin updates are saved centrally and visible to every signed-in user.`} />
    {isAdmin && <div style={{ marginBottom: 16 }}><Button small icon={Plus} onClick={() => { setEditingId(""); setDraft(emptyStation(location)); setShowForm((current) => !current); }}>{showForm ? "Close form" : "Add weather station"}</Button></div>}
    {showForm && isAdmin && <Card style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>{editingId ? "Update station readings" : "Add station readings"}</h3>
      <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        {fields.map(([field, label, type]) => <label key={field} style={labelStyle}>{label}{type === "select" ? <select style={inputStyle} value={draft[field] || (field === "status" ? "online" : "pending")} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}>{(field === "status" ? ["online", "offline", "maintenance"] : ["pending", "verified", "flagged"]).map((value) => <option key={value}>{value}</option>)}</select> : <input style={inputStyle} type={type} step={type === "number" ? "any" : undefined} required={field === "stationCode" || field === "location"} value={draft[field] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} />}</label>)}
        <div style={{ gridColumn: "1 / -1" }}><Button type="submit" small icon={null}>{busy ? "Saving…" : editingId ? "Save station" : "Create station"}</Button></div>
      </form>
    </Card>}
    {error && <p role="alert" style={{ color: "#A73A2F" }}>{error}</p>}
    {stations.length === 0 && !error ? <Card>No station readings have been entered for this location yet.</Card> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
      {stations.map((station) => <Card key={station._id}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}><div><Eyebrow>{station.stationCode}</Eyebrow><strong>{station.location}</strong></div><span style={{ textTransform: "capitalize", color: station.status === "online" ? C.green : "#B98A2E", fontSize: 12, fontWeight: 700 }}>{station.status}</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginTop: 18 }}>
          {[["Temperature", station.temperatureC, "°C"], ["Feels like", station.feelsLikeC, "°C"], ["Humidity", station.humidityPct, "%"], ["Heat index", station.heatIndexC, "°C"], ["Wind", station.windKph, "km/h"], ["UV", station.uvIndex, ""], ["Pressure", station.pressureHpa, "hPa"], ["AQI", station.aqi, ""]].map(([label, value, unit]) => <div key={label}><div style={{ fontSize: 11, color: C.textFaint }}>{label}</div><strong>{displayValue(value, unit)}</strong></div>)}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 12, fontSize: 12, color: C.textMuted }}>Battery {displayValue(station.batteryPercent, "%")} · Solar {station.solarStatus || "—"}<br />Validation: {station.validationStatus} · Synced {station.lastSyncedAt ? new Date(station.lastSyncedAt).toLocaleString() : "not recorded"}</div>
        {isAdmin && <Button small variant="secondary" icon={Pencil} style={{ marginTop: 14 }} onClick={() => edit(station)}>Edit readings</Button>}
      </Card>)}
    </div>}
  </div>;
}

const defaultForecastDraft = (location) => ({
  location,
  forecastDate: localDate(Date.now() + 86400000),
  minTempC: "",
  maxTempC: "",
  heatwaveProbability: "",
  confidence: "",
  riskLevel: "MODERATE",
  source: "Admin forecast",
  notes: "",
});

export function Prediction({ location, user }) {
  const fallback = LOCATION_DATA[location];
  const [officialForecasts, setOfficialForecasts] = useState([]);
  const [weatherForecast, setWeatherForecast] = useState([]);
  const [draft, setDraft] = useState(() => defaultForecastDraft(location));
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [weatherError, setWeatherError] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = user.role === "admin";
  const [today] = useState(() => localDate(Date.now()));

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      apiRequest(`/forecasts?location=${encodeURIComponent(location)}&limit=100`),
      apiRequest(`/weather/forecast?location=${encodeURIComponent(location)}&days=5`),
    ]);
    if (results[0].status === "fulfilled") {
      if (Array.isArray(results[0].value)) {
        setOfficialForecasts(results[0].value);
        setError("");
      } else setError("The API returned an invalid saved forecast list.");
    } else setError(results[0].reason.message);
    if (results[1].status === "fulfilled") {
      setWeatherForecast(results[1].value.forecast?.forecastday || []);
      setWeatherError("");
    } else setWeatherError(results[1].reason.message);
  }, [location]);

  useEffect(() => {
    let active = true;
    const load = () => Promise.allSettled([
      apiRequest(`/forecasts?location=${encodeURIComponent(location)}&limit=100`),
      apiRequest(`/weather/forecast?location=${encodeURIComponent(location)}&days=5`),
    ]).then((results) => {
      if (!active) return;
      if (results[0].status === "fulfilled") {
        if (Array.isArray(results[0].value)) {
          setOfficialForecasts(results[0].value);
          setError("");
        } else setError("The API returned an invalid saved forecast list.");
      } else setError(results[0].reason.message);
      if (results[1].status === "fulfilled") {
        setWeatherForecast(results[1].value.forecast?.forecastday || []);
        setWeatherError("");
      } else setWeatherError(results[1].reason.message);
    });
    load();
    const interval = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [location]);
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      ...draft,
      forecastDate: new Date(`${draft.forecastDate}T12:00:00`).toISOString(),
      minTempC: numeric(draft.minTempC),
      maxTempC: numeric(draft.maxTempC),
      heatwaveProbability: numeric(draft.heatwaveProbability),
      confidence: numeric(draft.confidence),
    };
    for (const field of ["minTempC", "confidence", "notes"]) if (body[field] === undefined || body[field] === "") delete body[field];
    try {
      await apiRequest(editingId ? `/forecasts/${editingId}` : "/forecasts", { method: editingId ? "PATCH" : "POST", body });
      setShowForm(false);
      setEditingId("");
      setDraft(defaultForecastDraft(location));
      await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const liveDays = weatherForecast.map((entry) => {
    const date = entry.date;
    const official = officialForecasts.find((item) => localDate(item.forecastDate) === date);
    return {
      date,
      name: entry.date === today ? "Today" : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      minTempC: official?.minTempC ?? entry.day.mintemp_c,
      maxTempC: official?.maxTempC ?? entry.day.maxtemp_c,
      probability: official?.heatwaveProbability,
      riskLevel: official?.riskLevel || fallback.risk,
      official,
    };
  });

  const edit = (day) => {
    const current = day.official;
    setDraft(current ? {
      location: current.location,
      forecastDate: localDate(current.forecastDate),
      minTempC: current.minTempC ?? "",
      maxTempC: current.maxTempC ?? day.maxTempC,
      heatwaveProbability: current.heatwaveProbability ?? "",
      confidence: current.confidence ?? "",
      riskLevel: current.riskLevel,
      source: current.source,
      notes: current.notes || "",
    } : {
      ...defaultForecastDraft(location),
      forecastDate: day.date,
      minTempC: day.minTempC,
      maxTempC: day.maxTempC,
    });
    setEditingId(current?._id || "");
    setShowForm(true);
  };

  const nearestOfficial = [...officialForecasts].sort((a, b) => String(a.forecastDate).localeCompare(String(b.forecastDate)))[0];

  return <div>
    <SectionHeading eyebrow="Forecast" title="Five-day weather forecast" sub={`Live forecast for ${location}, with administrator-managed heatwave probabilities and risk levels.`} />
    {error && <p role="alert" style={{ color: "#A73A2F" }}>Saved forecast data: {error}</p>}
    {weatherError && <p role="alert" style={{ color: "#A73A2F" }}>Live weather forecast unavailable: {weatherError}</p>}
    <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><div style={{ fontSize: 12, color: C.textMuted }}>Heatwave probability · nearest saved forecast</div><strong style={{ fontSize: 32 }}>{nearestOfficial ? `${nearestOfficial.heatwaveProbability}%` : "Not set"}</strong><div style={{ marginTop: 4 }}>{nearestOfficial && <RiskIndicator risk={nearestOfficial.riskLevel} size="sm" />}</div></div>
      <div style={{ fontSize: 12, color: C.textFaint }}>{nearestOfficial ? `Updated ${new Date(nearestOfficial.updatedAt).toLocaleString()}` : "An administrator can set the probability below."}</div>
    </Card>
    {isAdmin && <div style={{ marginBottom: 14 }}><Button small icon={Plus} onClick={() => { setEditingId(""); setDraft(defaultForecastDraft(location)); setShowForm((value) => !value); }}>{showForm ? "Close editor" : "Add forecast day"}</Button></div>}
    {showForm && isAdmin && <Card style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>{editingId ? "Update official forecast" : "Add official forecast"}</h3>
      <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        <label style={labelStyle}>Location<input style={inputStyle} value={draft.location} onChange={(event) => setDraft((value) => ({ ...value, location: event.target.value }))} required /></label>
        <label style={labelStyle}>Forecast date<input style={inputStyle} type="date" value={draft.forecastDate} onChange={(event) => setDraft((value) => ({ ...value, forecastDate: event.target.value }))} required /></label>
        <label style={labelStyle}>Minimum °C<input style={inputStyle} type="number" step="any" value={draft.minTempC} onChange={(event) => setDraft((value) => ({ ...value, minTempC: event.target.value }))} /></label>
        <label style={labelStyle}>Maximum °C<input style={inputStyle} type="number" step="any" value={draft.maxTempC} onChange={(event) => setDraft((value) => ({ ...value, maxTempC: event.target.value }))} required /></label>
        <label style={labelStyle}>Heatwave probability %<input style={inputStyle} type="number" min="0" max="100" value={draft.heatwaveProbability} onChange={(event) => setDraft((value) => ({ ...value, heatwaveProbability: event.target.value }))} required /></label>
        <label style={labelStyle}>Confidence %<input style={inputStyle} type="number" min="0" max="100" value={draft.confidence} onChange={(event) => setDraft((value) => ({ ...value, confidence: event.target.value }))} /></label>
        <label style={labelStyle}>Risk level<select style={inputStyle} value={draft.riskLevel} onChange={(event) => setDraft((value) => ({ ...value, riskLevel: event.target.value }))}>{Object.keys(RISK).map((risk) => <option key={risk}>{risk}</option>)}</select></label>
        <label style={labelStyle}>Source<input style={inputStyle} value={draft.source} onChange={(event) => setDraft((value) => ({ ...value, source: event.target.value }))} required /></label>
        <div style={{ gridColumn: "1 / -1" }}><Button type="submit" small icon={null}>{busy ? "Saving…" : editingId ? "Save forecast" : "Publish forecast"}</Button></div>
      </form>
    </Card>}
    {liveDays.length === 0 && !weatherError ? <Card>Fetching the five-day forecast…</Card> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12 }}>
      {liveDays.map((day) => <Card key={day.date}>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{day.name}</div>
        <div style={{ fontSize: 22, margin: "10px 0", fontWeight: 500 }}>{Math.round(day.maxTempC)}°C</div>
        <div style={{ fontSize: 12, color: C.textMuted }}>Low {Math.round(day.minTempC)}°C</div>
        <div style={{ marginTop: 10 }}>{day.probability === undefined ? <span style={{ fontSize: 12, color: C.textFaint }}>Heatwave probability not set</span> : <><strong>{day.probability}%</strong><div><RiskIndicator risk={day.riskLevel} size="sm" /></div></>}</div>
        {isAdmin && <Button small variant="secondary" icon={Pencil} style={{ marginTop: 12 }} onClick={() => edit(day)}>{day.official ? "Edit forecast" : "Set probability"}</Button>}
      </Card>)}
    </div>}
    {error && !isAdmin && <Card style={{ marginTop: 14 }}>Administrators can publish official forecast probabilities after forecast data is available.</Card>}
    <p style={{ marginTop: 18, fontSize: 11, color: C.textFaint }}>Model reference: {MODEL_METADATA.version}</p>
  </div>;
}

const emptyWarning = (location) => ({ location, title: "", message: "", severity: "MODERATE", startsAt: new Date().toISOString().slice(0, 16), status: "published" });

export function Warnings({ location, user }) {
  const [alerts, setAlerts] = useState([]);
  const [draft, setDraft] = useState(() => emptyWarning(location));
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = user.role === "admin";

  const refresh = useCallback(async () => {
    try {
      const result = await apiRequest(`/alerts?location=${encodeURIComponent(location)}&limit=100`);
      if (!Array.isArray(result)) throw new Error("The API returned an invalid warning list.");
      setAlerts(result);
      setError("");
    } catch (requestError) { setError(requestError.message); }
  }, [location]);

  useEffect(() => {
    let active = true;
    const load = () => apiRequest(`/alerts?location=${encodeURIComponent(location)}&limit=100`)
      .then((result) => {
        if (!Array.isArray(result)) throw new Error("The API returned an invalid warning list.");
        if (active) { setAlerts(result); setError(""); }
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    load();
    const interval = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [location]);
  const publish = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest("/alerts", { method: "POST", body: { ...draft, startsAt: new Date(draft.startsAt).toISOString() } });
      setShowForm(false);
      setDraft(emptyWarning(location));
      await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const expire = async (alert) => {
    try {
      await apiRequest(`/alerts/${alert._id}`, { method: "PATCH", body: { status: "expired" } });
      await refresh();
    } catch (requestError) { setError(requestError.message); }
  };

  return <div>
    <SectionHeading eyebrow="Warning center" title="Warnings and advisories" sub={`Published safety alerts for ${location}. Warnings published by administrators are shared with all users.`} />
    {isAdmin && <div style={{ marginBottom: 16 }}><Button small icon={Plus} onClick={() => setShowForm((value) => !value)}>{showForm ? "Close form" : "Add warning"}</Button></div>}
    {showForm && isAdmin && <Card style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>Publish a warning</h3>
      <form onSubmit={publish} style={{ display: "grid", gap: 12 }}>
        <label style={labelStyle}>Location<input style={inputStyle} value={draft.location} onChange={(event) => setDraft((value) => ({ ...value, location: event.target.value }))} required /></label>
        <label style={labelStyle}>Title<input style={inputStyle} value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} maxLength={160} required /></label>
        <label style={labelStyle}>Advisory message<textarea style={{ ...inputStyle, minHeight: 85 }} value={draft.message} onChange={(event) => setDraft((value) => ({ ...value, message: event.target.value }))} maxLength={4000} required /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>Severity<select style={inputStyle} value={draft.severity} onChange={(event) => setDraft((value) => ({ ...value, severity: event.target.value }))}>{Object.keys(RISK).map((risk) => <option key={risk}>{risk}</option>)}</select></label>
          <label style={labelStyle}>Starts at<input style={inputStyle} type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft((value) => ({ ...value, startsAt: event.target.value }))} required /></label>
        </div>
        <div><Button type="submit" small icon={null}>{busy ? "Publishing…" : "Publish warning"}</Button></div>
      </form>
    </Card>}
    {error && <p role="alert" style={{ color: "#A73A2F" }}>{error}</p>}
    {alerts.length === 0 && !error ? <Card>No published warnings for this location.</Card> : <div style={{ display: "grid", gap: 12 }}>
      {alerts.map((alert) => {
        const severity = RISK[alert.severity] || RISK.MODERATE;
        return <Card key={alert._id} style={{ borderLeft: `4px solid ${severity.color}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><strong style={{ fontSize: 16 }}>{alert.title}</strong><RiskIndicator risk={alert.severity} size="sm" /></div>
          <p style={{ color: C.textMuted, lineHeight: 1.6 }}>{alert.message}</p>
          <div style={{ fontSize: 12, color: C.textFaint }}>{alert.location} · {new Date(alert.startsAt).toLocaleString()} · {alert.status}</div>
          {isAdmin && alert.status === "published" && <Button small variant="secondary" icon={X} style={{ marginTop: 12 }} onClick={() => expire(alert)}>Expire warning</Button>}
        </Card>;
      })}
    </div>}
  </div>;
}
