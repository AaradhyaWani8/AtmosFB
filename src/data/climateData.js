export const THEMES = {
  light: {
    bg: "#F6F4EF",
    surface: "#FFFFFF",
    beige: "#E8E3D9",
    charcoal: "#171717",
    green: "#66735D",
    border: "#E5E1D8",
    textMuted: "#5C594F",
    textFaint: "#8B876F",
    header: "rgba(255,255,255,0.94)",
    station: "#F1F5EF",
    buttonBg: "#171717",
    buttonText: "#FFFFFF",
    inverseBg: "#171717",
    inverseText: "#F6F4EF",
  },
  dark: {
    bg: "#151817",
    surface: "#202522",
    beige: "#303832",
    charcoal: "#F4F1E8",
    green: "#A9B99D",
    border: "#3C453E",
    textMuted: "#C4C9C0",
    textFaint: "#939D92",
    header: "rgba(32,37,34,0.94)",
    station: "#263129",
    buttonBg: "#DCE5D4",
    buttonText: "#152017",
    inverseBg: "#101412",
    inverseText: "#F4F1E8",
  },
};

// Components read from this shared palette. Updating it and re-rendering App
// applies the selected theme across the site and dashboard.
export const C = {
  bg: "#F6F4EF",
  surface: "#FFFFFF",
  beige: "#E8E3D9",
  charcoal: "#171717",
  green: "#66735D",
  border: "#E5E1D8",
  textMuted: "#5C594F",
  textFaint: "#8B876F",
};

export function applyTheme(theme) {
  Object.assign(C, THEMES[theme]);
}

export const RISK = {
  LOW: { label: "LOW RISK", short: "LOW", color: "#3F7D4A" },
  MODERATE: { label: "MODERATE RISK", short: "MODERATE", color: "#B98A2E" },
  HIGH: { label: "HIGH RISK", short: "HIGH", color: "#BD6A34" },
  EXTREME: { label: "EXTREME RISK", short: "EXTREME", color: "#A73A2F" },
};

export const RADIUS = { sm: 4, md: 8, lg: 16, pill: 999 };
// Atmos currently monitors only these two Maharashtra regions.
export const LOCATIONS = ["Pune", "Mumbai"];

export const LOCATION_DATA = {
  Pune: { temp: 39, feels: 43, humidity: 48, heatIndex: 45, uv: 9, wind: 18, pressure: 1004, aqi: 132, probability: 82, confidence: 91, risk: "HIGH", maxTemp: 43, duration: 2, x: 46, y: 63, state: "Maharashtra" },
  Mumbai: { temp: 34, feels: 38, humidity: 71, heatIndex: 39, uv: 7, wind: 22, pressure: 1006, aqi: 98, probability: 44, confidence: 78, risk: "MODERATE", maxTemp: 36, duration: 1, x: 43, y: 61, state: "Maharashtra" },
};

export const AWS_STATIONS = [
  { id: "#AWS-104", city: "Pune", status: "Online", battery: "91%", solar: "Stable", sync: "2 mins ago", validation: "Verified" },
  { id: "#AWS-221", city: "Mumbai", status: "Online", battery: "84%", solar: "Stable", sync: "4 mins ago", validation: "Verified" },
];

export const MODEL_METADATA = {
  version: "BiLSTM-SpatioTemporal v2.4",
  dataset: "IMD Gridded Data 1981–2025",
  uncertainty: "±1.2°C",
};

export const PERSONAS = ["Citizen", "Farmer", "Health Department", "Local Authorities"];
export const PERSONA_CONTEXT = {
  Citizen: "Focus on personal heat safety, hydration, vulnerable family members, and when to avoid outdoor exposure.",
  Farmer: "Focus on irrigation timing, crop stress, livestock water, and safe field-work scheduling.",
  "Health Department": "Focus on heat-health surveillance, cooling shelters, ambulance readiness, and vulnerable populations.",
  "Local Authorities": "Focus on public alerts, cooling centers, worker protection, and municipal response coordination.",
};

export const NOTIFICATIONS = [
  { level: "EXTREME", title: "Extreme Heat Alert", body: "Risk level increased from High to Extreme.", time: "6m ago" },
  { level: "HIGH", title: "Forecast Update", body: "Tomorrow's maximum temperature increased by 2°C.", time: "41m ago" },
  { level: "MODERATE", title: "AI Insight", body: "Heat index expected to peak between 1–4 PM.", time: "2h ago" },
  { level: "LOW", title: "System", body: "Monitoring network refreshed for Pune and Mumbai.", time: "5h ago" },
];

export const RECOMMENDATIONS = [
  { title: "For General Public", iconName: "Users", items: ["Drink sufficient water.", "Avoid direct sunlight during peak hours.", "Wear lightweight clothing.", "Use shaded or cool areas."] },
  { title: "For Outdoor Workers", iconName: "HardHat", items: ["Take frequent breaks.", "Stay hydrated.", "Avoid unnecessary afternoon exposure.", "Monitor heat stress symptoms."] },
  { title: "For Elderly People", iconName: "User", items: ["Stay indoors during extreme heat.", "Maintain hydration.", "Check indoor temperature.", "Ensure access to cooling."] },
  { title: "For Farmers", iconName: "Sprout", items: ["Adjust irrigation schedules.", "Avoid heavy field work during peak heat.", "Monitor crop stress.", "Provide sufficient water to livestock."] },
];

const seeded = (seed) => {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

function buildSeries(base, points, spread) {
  const random = seeded(Math.round(base * 97));
  const values = [];
  for (let i = 0; i < points; i++) {
    const wobble = (random() - 0.5) * spread;
    const drift = Math.sin(i / (points / 6)) * (spread * 0.6);
    values.push(Math.round((base + wobble + drift) * 10) / 10);
  }
  return values;
}

export function trendSeries(location, range) {
  const base = LOCATION_DATA[location].temp;
  const config = {
    "24H": { points: 24, spread: 4, label: (i) => `${i}:00` },
    "7D": { points: 7, spread: 3, label: (i) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] },
    "30D": { points: 30, spread: 5, label: (i) => `D${i + 1}` },
    "1Y": { points: 12, spread: 6, label: (i) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i] },
  }[range];
  const today = buildSeries(base, config.points, config.spread);
  const yesterday = buildSeries(base - 1.5, config.points, config.spread);
  const average = base - 3.5;
  return today.map((value, i) => ({ x: config.label(i), today: value, yesterday: yesterday[i], average: Math.round((average + Math.sin(i) * 0.6) * 10) / 10 }));
}

export function historySeries(location, range) {
  const base = LOCATION_DATA[location].temp;
  const points = { "7D": 7, "30D": 30, "6M": 24, "1Y": 12, "5Y": 5 }[range];
  const labels = {
    "7D": (i) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    "30D": (i) => `D${i + 1}`,
    "6M": (i) => `W${i + 1}`,
    "1Y": (i) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
    "5Y": (i) => `${2022 + i}`,
  };
  const average = base - 5.5;
  return buildSeries(base - 4, points, 6).map((value, i) => ({ x: labels[range](i), temp: value, average: Math.round((average + Math.sin(i / 2) * 0.5) * 10) / 10 }));
}

export function forecastDays(location) {
  const data = LOCATION_DATA[location];
  const risks = ["MODERATE", "HIGH", "EXTREME", "HIGH", "MODERATE"];
  const deltas = [0, 2, 4, 3, 1];
  return ["Today", "Tomorrow", "Day 3", "Day 4", "Day 5"].map((name, i) => ({
    name,
    temp: Math.round(data.temp + (deltas[i] - 1)),
    risk: data.risk === "LOW" ? (i >= 2 ? "MODERATE" : "LOW") : risks[i],
  }));
}

export function predictionFactors(location) {
  const data = LOCATION_DATA[location];
  return [
    { label: "Temperature anomaly", value: Math.min(96, data.temp * 2 - 20) },
    { label: "Humidity deficit", value: 100 - data.humidity },
    { label: "Wind conditions", value: Math.max(10, 60 - data.wind) },
    { label: "Historical heatwave pattern", value: data.probability - 6 },
    { label: "Atmospheric pressure", value: 1020 - data.pressure > 0 ? (1020 - data.pressure) * 4 : 20 },
    { label: "Soil moisture deficit", value: Math.min(95, data.uv * 8) },
    { label: "Urban heat island effect", value: data.aqi > 120 ? 78 : 42 },
  ];
}

export function metrics(location, icons) {
  const data = LOCATION_DATA[location];
  return [
    { key: "temp", label: "Temperature", value: data.temp, unit: "°C", change: 2.4, icon: icons.Thermometer },
    { key: "feels", label: "Feels Like", value: data.feels, unit: "°C", change: 3.1, icon: icons.Gauge },
    { key: "humidity", label: "Humidity", value: data.humidity, unit: "%", change: -4, icon: icons.Droplets },
    { key: "heatIndex", label: "Heat Index", value: data.heatIndex, unit: "°C", change: 2.9, icon: icons.Thermometer },
    { key: "wind", label: "Wind Speed", value: data.wind, unit: "km/h", change: -1.2, icon: icons.Wind },
    { key: "uv", label: "UV Index", value: data.uv, unit: "", change: 1, icon: icons.Sun },
    { key: "pressure", label: "Pressure", value: data.pressure, unit: "hPa", change: -0.6, icon: icons.Gauge },
    { key: "aqi", label: "Air Quality", value: data.aqi, unit: "AQI", change: 6, icon: icons.CloudSun },
  ];
}
