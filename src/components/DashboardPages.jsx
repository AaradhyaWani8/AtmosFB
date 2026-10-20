import { useState, useMemo, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CloudSun,
  Droplets,
  Gauge,
  HardHat,
  MapPin,
  Send,
  Sprout,
  Sun,
  Thermometer,
  User,
  Users,
  Wind,
} from "lucide-react";
import { ComposableMap, Geography, Geographies } from "react-simple-maps";
import {
  AWS_STATIONS,
  C,
  LOCATION_DATA,
  MODEL_METADATA,
  PERSONAS,
  RADIUS,
  RECOMMENDATIONS,
  RISK,
  forecastDays,
  historySeries,
  metrics,
  predictionFactors,
  trendSeries,
} from "../data/climateData";
import { answerWithAi, isAiConfigured } from "../services/ai";
import {
  Button,
  Card,
  Eyebrow,
  RiskIndicator,
  SectionHeading,
  TrendArrow,
} from "./ui";

function AWSPanel({ location }) {
  const station = AWS_STATIONS.find((entry) => entry.city === location) || AWS_STATIONS[0];
  return (
    <Card style={{ marginBottom: 20, background: C.station }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div><Eyebrow>IoT Weather Station</Eyebrow><div style={{ fontWeight: 600, fontSize: 16 }}>Ground validation telemetry · {station.id}</div><div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{station.city} AWS node · <span style={{ color: RISK.LOW.color, fontWeight: 700 }}>{station.status}</span></div></div>
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: "right" }}>Last sync<br /><strong style={{ color: C.charcoal }}>{station.sync}</strong></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <div><div style={{ fontSize: 11, color: C.textFaint }}>Battery</div><strong>{station.battery}</strong></div>
        <div><div style={{ fontSize: 11, color: C.textFaint }}>Solar input</div><strong>{station.solar}</strong></div>
        <div><div style={{ fontSize: 11, color: C.textFaint }}>Telemetry</div><strong>{station.status}</strong></div>
        <div><div style={{ fontSize: 11, color: C.textFaint }}>Validation</div><strong>{station.validation}</strong></div>
      </div>
    </Card>
  );
}

function EditableStationTable() {
  const [stations, setStations] = useState(AWS_STATIONS);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const startEditing = (station) => {
    setEditingId(station.id);
    setDraft({ ...station });
  };
  const saveStation = () => {
    setStations((currentStations) => currentStations.map((station) => station.id === editingId ? draft : station));
    setEditingId(null);
  };

  return <Card style={{ marginTop: 20, overflowX: "auto" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}><div><Eyebrow>Station Management</Eyebrow><div style={{ fontSize: 16, fontWeight: 600 }}>Weather station table</div></div><span style={{ fontSize: 12, color: C.textMuted }}>Edit a row, then save its local changes.</span></div>
    <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse", fontSize: 13 }}>
      <thead><tr>{["Station", "City", "Status", "Battery", "Last sync", "Action"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: "10px 8px", color: C.textFaint, fontSize: 11, letterSpacing: 0.5, borderBottom: `1px solid ${C.border}` }}>{heading}</th>)}</tr></thead>
      <tbody>{stations.map((station) => {
        const isEditing = station.id === editingId;
        const cell = (field) => isEditing ? <input value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} style={{ width: "100%", background: C.bg, color: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 7px" }} /> : station[field];
        return <tr key={station.id}><td style={{ padding: "12px 8px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{station.id}</td><td style={{ padding: "12px 8px", borderBottom: `1px solid ${C.border}` }}>{cell("city")}</td><td style={{ padding: "12px 8px", borderBottom: `1px solid ${C.border}` }}>{cell("status")}</td><td style={{ padding: "12px 8px", borderBottom: `1px solid ${C.border}` }}>{cell("battery")}</td><td style={{ padding: "12px 8px", borderBottom: `1px solid ${C.border}` }}>{cell("sync")}</td><td style={{ padding: "12px 8px", borderBottom: `1px solid ${C.border}` }}>{isEditing ? <><button onClick={saveStation} style={{ border: "none", cursor: "pointer", color: C.buttonText, background: C.buttonBg, borderRadius: 4, padding: "6px 9px", marginRight: 6 }}>Save</button><button onClick={() => setEditingId(null)} style={{ border: `1px solid ${C.border}`, cursor: "pointer", color: C.charcoal, background: C.surface, borderRadius: 4, padding: "5px 8px" }}>Cancel</button></> : <button onClick={() => startEditing(station)} style={{ border: `1px solid ${C.border}`, cursor: "pointer", color: C.charcoal, background: C.beige, borderRadius: 4, padding: "5px 9px" }}>Edit</button>}</td></tr>;
      })}</tbody>
    </table>
  </Card>;
}

export function Dashboard({ location, setPage }) {
  const data = LOCATION_DATA[location];
  const series = useMemo(() => trendSeries(location, "24H"), [location]);
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Eyebrow>Climate Intelligence</Eyebrow>
        <h1
          style={{
            fontWeight: 400,
            fontSize: "clamp(28px,3.2vw,40px)",
            letterSpacing: -0.5,
            margin: 0,
            color: C.charcoal,
          }}
        >
          Climate intelligence for a safer tomorrow.
        </h1>
        <p
          style={{
            color: C.textMuted,
            fontSize: 14.5,
            marginTop: 10,
            maxWidth: 540,
            lineHeight: 1.6,
          }}
        >
          Monitor heatwave conditions, predict emerging risks, and receive
          timely warnings.
        </p>
        <div
          style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}
        >
          <Button small onClick={() => setPage("riskmap")}>
            View Risk Map
          </Button>
          <Button
            small
            variant="secondary"
            onClick={() => setPage("prediction")}
          >
            Check Forecast
          </Button>
        </div>
      </div>
      <AWSPanel location={location} />
      <EditableStationTable />
      <Card style={{ marginBottom: 20 }}>
        <Eyebrow>Current Heatwave Status</Eyebrow>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 18,
          }}
        >
          <div>
            <RiskIndicator risk={data.risk} />
            <div
              style={{
                color: C.textMuted,
                fontSize: 13,
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <MapPin size={13} /> {location}, {data.state}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                marginTop: 16,
              }}
            >
              <span
                style={{
                  fontWeight: 500,
                  fontSize: 42,
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                {data.temp}&deg;
              </span>
              <span style={{ color: C.textMuted, fontSize: 13.5 }}>
                Feels like {data.feels}&deg;C
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 30 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11.5, color: C.textFaint }}>
                Heatwave probability
              </div>
              <div style={{ fontWeight: 500, fontSize: 26 }}>
                {data.probability}%
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11.5, color: C.textFaint }}>
                Expected peak
              </div>
              <div style={{ fontWeight: 500, fontSize: 26 }}>
                {data.maxTemp}&deg;C
              </div>
            </div>
          </div>
        </div>
      </Card>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {[
          ["Humidity", `${data.humidity}%`, Droplets],
          ["Heat Index", `${data.heatIndex}°C`, Thermometer],
          ["Wind", `${data.wind} km/h`, Wind],
          ["UV Index", data.uv, Sun],
        ].map(([label, value, Icon]) => (
          <Card key={label} style={{ padding: 18 }}>
            <Icon size={15} strokeWidth={1.6} color={C.textMuted} />
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>
              {label}
            </div>
            <div style={{ fontWeight: 600, fontSize: 21, marginTop: 2 }}>
              {value}
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ fontWeight: 600, fontSize: 15 }}>
          24-Hour Temperature Trend
        </div>
        <div style={{ height: 200, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={C.border}
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 10, fill: C.textFaint }}
                axisLine={false}
                tickLine={false}
                interval={3}
              />
              <YAxis hide domain={["dataMin - 3", "dataMax + 3"]} />
              <Tooltip
                contentStyle={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="today"
                stroke={C.green}
                strokeWidth={1.75}
                fill="url(#tempGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export function Monitoring({ location }) {
  const [range, setRange] = useState("24H");
  const data = useMemo(() => trendSeries(location, range), [location, range]);
  const locationMetrics = metrics(location, {
    Thermometer,
    Gauge,
    Droplets,
    Wind,
    Sun,
    CloudSun,
  });
  return (
    <div>
      <SectionHeading
        eyebrow="Live Metrics"
        title="Heatwave Monitoring"
        sub={`Real-time climate readings for ${location}.`}
      />
      <AWSPanel location={location} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {locationMetrics.map((metric) => (
          <Card key={metric.key} style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <metric.icon size={15} strokeWidth={1.6} color={C.textMuted} />
              <TrendArrow change={metric.change} />
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 12 }}>
              {metric.label}
            </div>
            <div style={{ fontWeight: 600, fontSize: 22, marginTop: 2 }}>
              {metric.value}
              <span style={{ fontSize: 12, color: C.textFaint }}>
                {metric.unit ? ` ${metric.unit}` : ""}
              </span>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15 }}>Temperature Trend</div>
          <div
            style={{
              display: "flex",
              gap: 4,
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: 3,
            }}
          >
            {["24H", "7D", "30D", "1Y"].map((period) => (
              <button
                key={period}
                onClick={() => setRange(period)}
                style={{
                  border: "none",
                  padding: "6px 13px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: range === period ? C.buttonBg : "transparent",
                  color: range === period ? C.buttonText : C.textMuted,
                }}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 300, marginTop: 18 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                stroke={C.border}
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 11, fill: C.textFaint }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: C.textFaint }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="today"
                name="Today"
                stroke={C.green}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export function Prediction({ location }) {
  const data = LOCATION_DATA[location];
  const days = forecastDays(location);
  const factors = predictionFactors(location);
  return (
    <div>
      <SectionHeading
        eyebrow="AI Forecast"
        title="AI Heatwave Prediction"
        sub={`Five-day outlook for ${location}, based on live indicators.`}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div
            style={{
              fontSize: 11.5,
              color: C.textFaint,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            Heatwave Probability
          </div>
          <div
            style={{
              fontWeight: 500,
              fontSize: 40,
              marginTop: 6,
              letterSpacing: -1,
            }}
          >
            {data.probability}%
          </div>
          <p
            style={{
              color: C.textMuted,
              fontSize: 13.5,
              marginTop: 8,
              lineHeight: 1.6,
            }}
          >
            High probability of heatwave conditions within the next 48 hours.
          </p>
          <div style={{ marginTop: 12 }}>
            <RiskIndicator risk={data.risk} />
          </div>
          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: `1px solid ${C.border}`,
              fontSize: 11,
              color: C.textFaint,
            }}
          >
            Model: {MODEL_METADATA.version}
            <br />
            Training: {MODEL_METADATA.dataset}
            <br />
            Uncertainty: {MODEL_METADATA.uncertainty}
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            AI Prediction Factors
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 11,
              marginTop: 14,
            }}
          >
            {factors.map((factor) => (
              <div key={factor.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: C.textMuted,
                    marginBottom: 4,
                  }}
                >
                  <span>{factor.label}</span>
                  <span style={{ fontWeight: 600, color: C.charcoal }}>
                    {Math.round(factor.value)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    background: C.bg,
                    borderRadius: 999,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(4, factor.value))}%`,
                      borderRadius: 999,
                      background: C.green,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ marginTop: 22 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
          5-Day Forecast
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))",
            gap: 12,
          }}
        >
          {days.map((day, index) => (
            <Card
              key={day.name}
              style={{
                textAlign: "center",
                border: `1px solid ${index === 0 ? C.charcoal : C.border}`,
                padding: 18,
              }}
            >
              <div
                style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}
              >
                {day.name}
              </div>
              <div
                style={{
                  fontWeight: 500,
                  fontSize: 24,
                  margin: "10px 0",
                  letterSpacing: -0.5,
                }}
              >
                {day.temp}&deg;C
              </div>
              <RiskIndicator risk={day.risk} size="sm" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RiskMap({ location, setLocation, setPage }) {
  const data = LOCATION_DATA[location];
  return (
    <div>
      <SectionHeading
        eyebrow="Geospatial View"
        title="Heatwave Risk Map"
        sub="Select a region to inspect its current conditions and risk level."
      />
      <div
        style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}
      >
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ position: "relative", height: 440, background: C.bg }}>
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: [78.9, 22.5], scale: 840 }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
              aria-label="Map of India with state borders"
            >
              <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
                {({ geographies }) =>
                  geographies
                    .filter((geo) => geo.properties.name === "India")
                    .map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="rgba(102,115,93,0.08)"
                        stroke={C.green}
                        strokeWidth={1.2}
                      />
                    ))
                }
              </Geographies>
              <Geographies geography="https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson">
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="transparent"
                      stroke={C.border}
                      strokeWidth={0.55}
                    />
                  ))
                }
              </Geographies>
            </ComposableMap>
            {Object.entries(LOCATION_DATA).map(([name, locationData]) => {
              const risk = RISK[locationData.risk];
              const selectedLocation = name === location;
              return (
                <button
                  key={name}
                  aria-label={`${name} risk marker`}
                  onClick={() => setLocation(name)}
                  style={{
                    position: "absolute",
                    left: `${locationData.x}%`,
                    top: `${locationData.y}%`,
                    transform: "translate(-50%,-50%)",
                    width: selectedLocation ? 16 : 11,
                    height: selectedLocation ? 16 : 11,
                    borderRadius: 999,
                    background: risk.color,
                    border: `2px solid ${C.surface}`,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: selectedLocation ? 20 : 15,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: 11,
                      whiteSpace: "nowrap",
                      color: C.textMuted,
                      fontWeight: selectedLocation ? 700 : 500,
                    }}
                  >
                    {name}
                  </span>
                </button>
              );
            })}
            <div
              style={{
                position: "absolute",
                left: 16,
                bottom: 14,
                color: C.textMuted,
                fontSize: 11,
                background: C.header,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.sm,
                padding: "8px 10px",
              }}
            >
              Click on a region to get details
            </div>
          </div>
        </Card>
        <Card>
          <div
            style={{
              fontSize: 11.5,
              color: C.textFaint,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Selected Region
          </div>
          <div style={{ fontWeight: 600, fontSize: 21, marginTop: 8 }}>
            {location}
          </div>
          <div style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
            {data.state}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginTop: 18,
              paddingTop: 16,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: C.textFaint }}>Temp</div>
              <strong style={{ fontSize: 18 }}>{data.temp}°C</strong>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.textFaint }}>Wind</div>
              <strong style={{ fontSize: 18 }}>{data.wind}</strong>
              <span style={{ fontSize: 11, color: C.textMuted }}> km/h</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.textFaint }}>Humidity</div>
              <strong style={{ fontSize: 18 }}>{data.humidity}%</strong>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <RiskIndicator risk={data.risk} />
          </div>
          <Button
            small
            style={{ marginTop: 18, width: "100%" }}
            onClick={() => setPage("ai")}
          >
            Go to AI Insights
          </Button>
        </Card>
      </div>
    </div>
  );
}

export function Warnings({ location }) {
  const data = LOCATION_DATA[location];
  const risk = RISK[data.risk];
  return (
    <div>
      <SectionHeading
        eyebrow="Warning Center"
        title="Early Warning System"
        sub={`Active alerts and escalation levels for ${location}.`}
      />
      <Card
        style={{ border: `1.5px solid ${risk.color}`, marginBottom: 24 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={19} strokeWidth={1.6} color={risk.color} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            {risk.label} HEATWAVE WARNING
          </span>
        </div>
        <p
          style={{
            color: C.textMuted,
            fontSize: 13.5,
            marginTop: 8,
            lineHeight: 1.6,
          }}
        >
          Temperatures may exceed{" "}
          <b style={{ color: C.charcoal }}>{data.maxTemp}°C</b> during the next
          48 hours.
        </p>
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: C.green, fontWeight: 600 }}>Status: Verified by Meteorologist (IMD Mumbai Desk)</span>
          <Button small onClick={() => window.print()}>Export Official Advisory (PDF)</Button>
        </div>
      </Card>
    </div>
  );
}

export function Analytics({ location }) {
  const [range, setRange] = useState("30D");
  const data = useMemo(() => historySeries(location, range), [location, range]);
  const [compareAverage, setCompareAverage] = useState(false);
  return (
    <div>
      <SectionHeading
        eyebrow="Historical Data"
        title="Climate Analytics"
        sub={`Long-range temperature trends for ${location}.`}
      />
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 6,
            gap: 4,
          }}
        >
          {["7D", "30D", "6M", "1Y", "5Y"].map((period) => (
            <button
              key={period}
              onClick={() => setRange(period)}
              style={{
                border: "none",
                padding: "6px 10px",
                borderRadius: 999,
                background: range === period ? C.buttonBg : C.bg,
                color: range === period ? C.buttonText : C.textMuted,
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              {period}
            </button>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 7, marginRight: "auto", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={compareAverage} onChange={(event) => setCompareAverage(event.target.checked)} />
            Compare with 10-Year Historical Average
          </label>
        </div>
        <div style={{ height: 280, marginTop: 18 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid
                stroke={C.border}
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 10.5, fill: C.textFaint }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: C.textFaint }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="temp" radius={[3, 3, 0, 0]} fill={C.green} />
              {compareAverage && <Line type="monotone" dataKey="average" name="10-Year Average" stroke={C.charcoal} strokeDasharray="5 5" strokeWidth={2} dot={false} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

const AI_STARTERS = [
  "What is the heatwave risk today?",
  "What precautions should I take?",
  "When will temperatures peak?",
];

export function AIInsights({ location }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: `Ask me anything about heatwave conditions in ${location}.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [persona, setPersona] = useState("Citizen");
  useEffect(() => {
    const form = document.querySelector("main form");
    const messagesElement = form?.previousElementSibling;
    if (messagesElement)
      messagesElement.scrollTop = messagesElement.scrollHeight;
  }, [messages, isLoading, input]);
  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || isLoading) return;
    setMessages((current) => [...current, { role: "user", text: question }]);
    setInput("");
    setIsLoading(true);
    try {
      const answer = await answerWithAi(question, location, persona);
      setMessages((current) => [...current, { role: "ai", text: answer }]);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div>
      <SectionHeading
        eyebrow="AI Climate Insight"
        title={`AI Insights for ${location}`}
        sub={`Ask about heatwave conditions in ${location}.`}
      />
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: isAiConfigured ? C.green : C.textFaint,
            }}
          >
            {isAiConfigured ? "Live Gemini enabled" : "Local climate assistant"}
          </span>
          <span style={{ fontSize: 11, color: C.textFaint }}>
            Region: {location}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }} aria-label="Advisory audience">
          {PERSONAS.map((entry) => <button key={entry} type="button" onClick={() => setPersona(entry)} style={{ border: `1px solid ${persona === entry ? C.buttonBg : C.border}`, background: persona === entry ? C.buttonBg : C.bg, color: persona === entry ? C.buttonText : C.textMuted, borderRadius: RADIUS.pill, padding: "7px 11px", cursor: "pointer", fontSize: 11.5 }}>{entry}</button>)}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {AI_STARTERS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => send(question)}
              style={{
                border: `1px solid ${C.border}`,
                background: C.bg,
                color: C.textMuted,
                borderRadius: RADIUS.pill,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 11.5,
                textAlign: "left",
              }}
            >
              {question}
            </button>
          ))}
        </div>
        <div
          style={{
            maxHeight: 260,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: message.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 13px",
                  borderRadius: RADIUS.md,
                  fontSize: 13,
                  background: message.role === "user" ? C.charcoal : C.bg,
                  color: message.role === "user" ? "#fff" : C.charcoal,
                }}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          style={{ display: "flex", gap: 8, marginTop: 16 }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about heatwave risk..."
            style={{
              flex: 1,
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.pill,
              padding: "10px 16px",
              outline: "none",
              color: C.charcoal,
              colorScheme: "inherit",
            }}
          />
          <Button
            small
            type="submit"
            icon={Send}
            style={{ opacity: isLoading ? 0.6 : 1 }}
          >
            {isLoading ? "Thinking" : "Ask"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

const recommendationIcons = { Users, HardHat, User, Sprout };
export function Recommendations() {
  return (
    <div>
      <SectionHeading
        eyebrow="Stay Safe"
        title="Safety & Recommendations"
        sub="Practical guidance to reduce heat-related risk."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))",
          gap: 16,
        }}
      >
        {RECOMMENDATIONS.map((recommendation) => {
          const Icon = recommendationIcons[recommendation.iconName];
          return (
            <Card key={recommendation.title}>
              <Icon size={19} strokeWidth={1.5} color={C.green} />
              <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 12 }}>
                {recommendation.title}
              </div>
              <ul
                style={{
                  margin: "10px 0 0",
                  paddingLeft: 18,
                  color: C.textMuted,
                  fontSize: 12.5,
                  lineHeight: 1.9,
                }}
              >
                {recommendation.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
export function About() {
  return (
    <div>
      <SectionHeading
        eyebrow="Methodology"
        title="About Atmos"
        sub="How this prototype models heatwave risk."
      />
      <Card style={{ maxWidth: 760 }}>
        <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
          Atmos provides advanced climate insights, sensor fusion metrics, and
          real-time alerts to safeguard communities against extreme
          temperatures.
        </p>
      </Card>
    </div>
  );
}
