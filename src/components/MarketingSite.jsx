import { Activity, AlertTriangle, Cpu, Gauge, Map as MapIcon, Moon, Radar, Satellite, ShieldAlert, Sun, TrendingUp } from "lucide-react";
import heatwaveHero from "../assets/heatwave-hero.jpeg";
import { C, RADIUS } from "../data/climateData";
import { Button, Container, Eyebrow, PlaceholderArt, SectionHeading } from "./ui";

const SITE_NAV = ["Station Monitoring", "Prediction", "Risk Map", "Science"];

function AnnouncementBar() {
  return <div style={{ background: C.inverseBg, color: C.inverseText, textAlign: "center", padding: "9px 16px", fontSize: 12, letterSpacing: 0.4 }}>Real-time heatwave intelligence, powered by climate science.</div>;
}

function SiteNavbar({ onNav, onLogin, theme, onToggleTheme }) {
  return <header style={{ position: "sticky", top: 0, zIndex: 40, background: C.header, backdropFilter: "blur(6px)", borderBottom: `1px solid ${C.border}` }}><Container style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px" }}><div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 2, color: C.charcoal }}>ATMOS</div><nav className="site-nav" style={{ display: "flex", alignItems: "center", gap: 30 }}>{SITE_NAV.map((label) => <button key={label} onClick={() => onNav(label)} style={{ background: "none", border: "none", fontSize: 13.5, color: C.charcoal, cursor: "pointer", fontWeight: 500 }}>{label}</button>)}<button onClick={onLogin} style={{ background: "none", border: "none", fontSize: 13.5, color: C.charcoal, cursor: "pointer", fontWeight: 600 }}>Login</button><button className="theme-toggle" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={onToggleTheme} style={{ background: C.beige, border: `1px solid ${C.border}`, color: C.charcoal, borderRadius: RADIUS.pill, padding: "7px 9px", display: "flex", cursor: "pointer" }}>{theme === "light" ? <Moon size={15} /> : <Sun size={15} />}</button></nav></Container></header>;
}

function Hero({ onOpenDashboard }) {
  return <section style={{ background: C.bg }}><Container style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", padding: "72px 24px" }}><div><Eyebrow>Early Warning, Redefined</Eyebrow><h1 style={{ fontWeight: 400, fontSize: "clamp(38px, 6vw, 72px)", lineHeight: 1.06, letterSpacing: -1.5, color: C.charcoal, margin: 0 }}>Know the heat before it arrives.</h1><p style={{ fontSize: 17, color: C.textMuted, marginTop: 22, maxWidth: 440, lineHeight: 1.65 }}>AI-powered heatwave monitoring, prediction and early warning, built on live climate intelligence.</p><div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}><Button onClick={() => onOpenDashboard()}>View Dashboard</Button><Button variant="secondary" onClick={() => onOpenDashboard("about")}>Explore the Science</Button></div></div><figure className="hero-climate-image"><img src={heatwaveHero} alt="Thermometer under the midday sun" /><figcaption>Extreme heat conditions · Heat safety awareness</figcaption></figure></Container></section>;
}

function CredibilityRow() {
  const stats = [["2", "Cities Monitored"], ["94%", "Prediction Accuracy"], ["24/7", "Real-time Data"]];
  return <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}><Container style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 48, padding: "26px 24px" }}>{stats.map(([value, label]) => <div key={label} style={{ fontSize: 13.5, color: C.textMuted }}><span style={{ fontWeight: 700, fontSize: 15, color: C.charcoal }}>{value}</span><span style={{ marginLeft: 4 }}>{label}</span></div>)}</Container></section>;
}

function PlatformShowcase() {
  const items = [{ title: "Station Monitoring", desc: "Weather station temperature, humidity and heat index readings.", icon: Activity, page: "monitoring" }, { title: "Prediction", desc: "Live five-day weather outlook and administrator-managed heatwave probabilities.", icon: TrendingUp, page: "prediction" }, { title: "Risk Map", desc: "Compare heatwave risk in Pune and Mumbai at a glance.", icon: MapIcon, page: "riskmap" }, { title: "Early Warnings", desc: "Clear alerts and role-specific recommended actions.", icon: AlertTriangle, page: "warnings" }];
  return <section style={{ background: C.bg, padding: "96px 0" }}><Container><SectionHeading eyebrow="The Platform" title="Meet Atmos" sub="A single, science-backed view of heatwave risk, from live conditions to five-day prediction." align="center" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))", gap: 18 }}>{items.map((item) => <div className="platform-card" key={item.title} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: 16 }}><PlaceholderArt tone="beige" height={160} icon={item.icon} /><div style={{ fontWeight: 600, fontSize: 16, marginTop: 16, color: C.charcoal }}>{item.title}</div><div style={{ fontSize: 13, color: C.textMuted, marginTop: 6, lineHeight: 1.6 }}>{item.desc}</div></div>)}</div></Container></section>;
}

function ScienceSection({ onOpenDashboard }) {
  const flow = [{ label: "Sensor & satellite data", icon: Satellite }, { label: "Atmospheric analysis", icon: Radar }, { label: "AI prediction model", icon: Cpu }, { label: "Risk classification", icon: Gauge }, { label: "Early warning", icon: ShieldAlert }];
  return <section style={{ background: C.inverseBg, padding: "96px 0" }}><Container style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}><div><Eyebrow dark>The Science</Eyebrow><h2 style={{ fontWeight: 400, fontSize: "clamp(28px,4vw,44px)", color: C.inverseText, lineHeight: 1.15, letterSpacing: -0.5, margin: 0 }}>The science of heatwave prediction</h2><p style={{ color: "#C7C4B8", fontSize: 15.5, marginTop: 18, lineHeight: 1.7, maxWidth: 440 }}>Climate Intelligence combines live sensor networks with historical heatwave patterns in a single AI prediction model.</p><div style={{ marginTop: 28 }}><Button variant="ghost" onClick={() => onOpenDashboard("about")}>View Methodology</Button></div></div><div style={{ display: "flex", flexDirection: "column" }}>{flow.map((item, index) => <div key={item.label}><div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: RADIUS.md, background: "rgba(255,255,255,0.03)" }}><item.icon size={16} strokeWidth={1.5} color="#C7C4B8" /><span style={{ color: C.inverseText, fontSize: 14 }}>{item.label}</span></div>{index < flow.length - 1 && <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)", margin: "0 0 0 32px" }} />}</div>)}</div></Container></section>;
}

export default function MarketingSite({ onOpenDashboard, onLogin, theme, onToggleTheme }) {
  const pageForNav = { "Station Monitoring": "monitoring", Prediction: "prediction", "Risk Map": "riskmap", Science: "about" };
  return <div className="site-enter" style={{ background: C.bg, color: C.charcoal, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}><AnnouncementBar /><SiteNavbar onNav={(label) => onOpenDashboard(pageForNav[label])} onLogin={onLogin} theme={theme} onToggleTheme={onToggleTheme} /><Hero onOpenDashboard={onOpenDashboard} /><CredibilityRow /><PlatformShowcase /><ScienceSection onOpenDashboard={onOpenDashboard} /></div>;
}
