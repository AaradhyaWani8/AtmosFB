import { useState } from "react";
import { AlertTriangle, Activity, BarChart3, Bell, Brain, Info, LayoutDashboard, Map as MapIcon, Moon, Settings, Shield, Sun, Thermometer, TrendingUp, MapPin, ClipboardList, LogOut } from "lucide-react";
import { C, LOCATIONS, NOTIFICATIONS, RADIUS } from "../data/climateData";
import { RiskIndicator } from "./ui";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "monitoring", label: "Station Monitoring", icon: Activity },
  { id: "prediction", label: "Prediction", icon: TrendingUp },
  { id: "riskmap", label: "Risk Map", icon: MapIcon },
  { id: "warnings", label: "Warnings", icon: AlertTriangle },
  { id: "discrepancies", label: "Discrepancies", icon: ClipboardList },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "ai", label: "AI Insights", icon: Brain },
  { id: "recommendations", label: "Recommendations", icon: Shield },
  { id: "about", label: "About", icon: Info },
];

const NAV_GROUPS = [
  { label: "Overview", ids: ["dashboard", "monitoring", "riskmap", "warnings", "discrepancies"] },
  { label: "Insights", ids: ["prediction", "analytics", "ai"] },
  { label: "Guidance", ids: ["recommendations"] },
];

function NavigationMenu({ page, onNavigate }) {
  return <>
    {NAV_GROUPS.map((group) => <div key={group.label} style={{ marginBottom: 18 }}>
      <div style={{ padding: "0 12px 7px", color: C.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>{group.label}</div>
      {group.ids.map((id) => { const item = NAV.find((entry) => entry.id === id); return <NavItem key={item.id} n={item} active={page === item.id} onClick={() => onNavigate(item.id)} />; })}
    </div>)}
    <NavItem n={NAV.find((item) => item.id === "about")} active={page === "about"} onClick={() => onNavigate("about")} />
  </>;
}

function NavItem({ n, active, onClick }) {
  const Icon = n.icon;
  return <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: RADIUS.md, background: active ? C.beige : "transparent", color: active ? C.charcoal : C.textMuted, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: active ? 600 : 500, textAlign: "left", width: "100%", fontFamily: "Inter, sans-serif" }}><Icon size={16} strokeWidth={1.6} />{n.label}</button>;
}

function Brand({ onClick }) {
  return <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: onClick ? "pointer" : "default", padding: 0 }}>
    <div style={{ width: 32, height: 32, borderRadius: RADIUS.sm, background: C.buttonBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Thermometer size={16} color={C.buttonText} strokeWidth={1.5} /></div>
    <div style={{ textAlign: "left" }}><div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: 1.5, color: C.charcoal }}>ATMOS</div><div style={{ fontSize: 10, color: C.textFaint, letterSpacing: 0.5 }}>Heatwave Early Warning</div></div>
  </button>;
}

export default function AppShell({ page, setPage, location, setLocation, user, onLogout, onExit, theme, onToggleTheme, children }) {
  const [notifOpen, setNotifOpen] = useState(false);
  return <div style={{ minHeight: "100vh", background: C.bg, color: C.charcoal, fontFamily: "Inter, sans-serif", display: "flex" }}>
    <aside className="dashboard-sidebar" style={{ width: 236, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.surface, display: "flex", flexDirection: "column", padding: 18, position: "sticky", top: 0, height: "100vh" }}>
      <Brand onClick={onExit} />
      <nav style={{ marginTop: 26, display: "flex", flexDirection: "column" }}><NavigationMenu page={page} onNavigate={setPage} /></nav>
      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${C.border}` }}><NavItem n={{ id: "back", label: "Back to site", icon: Settings }} active={false} onClick={onExit} /></div>
    </aside>
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <header className="dashboard-header" style={{ position: "sticky", top: 0, zIndex: 20, background: C.header, backdropFilter: "blur(6px)", borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <div className="dashboard-location" style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, background: C.bg, border: `1px solid ${C.border}`, borderRadius: RADIUS.pill, padding: "8px 14px", minWidth: 190 }}><MapPin size={14} /><select aria-label="Select monitored region" value={location} onChange={(event) => setLocation(event.target.value)} style={{ background: "transparent", border: "none", color: C.charcoal, fontSize: 13, fontWeight: 500, outline: "none", flex: 1, colorScheme: theme }}>{LOCATIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}><span style={{ fontSize: 12, color: C.textMuted }}>{user.name} · <strong style={{ textTransform: "capitalize" }}>{user.role}</strong></span><button className="theme-toggle" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={onToggleTheme} style={{ background: C.beige, border: `1px solid ${C.border}`, color: C.charcoal, borderRadius: RADIUS.pill, padding: 7, display: "flex", cursor: "pointer" }}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button><div style={{ position: "relative" }}><button aria-label="Toggle notifications" onClick={() => setNotifOpen((value) => !value)} style={{ background: "none", border: "none", color: C.textMuted, position: "relative", cursor: "pointer" }}><Bell size={17} /><span style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: 999, background: "#A73A2F" }} /></button>{notifOpen && <div style={{ position: "absolute", right: 0, top: 30, width: 300, background: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: 8, boxShadow: "0 12px 28px rgba(23,23,23,0.1)", zIndex: 30 }}>{NOTIFICATIONS.map((notification, index) => <div key={index} style={{ padding: "10px 8px", borderBottom: index < NOTIFICATIONS.length - 1 ? `1px solid ${C.border}` : "none" }}><RiskIndicator risk={notification.level} size="sm" /><div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{notification.title}</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{notification.body}</div><div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 3 }}>{notification.time}</div></div>)}</div>}</div><button onClick={onLogout} style={{ display: "inline-flex", gap: 6, alignItems: "center", border: `1px solid ${C.border}`, borderRadius: RADIUS.pill, padding: "7px 10px", background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 12 }}><LogOut size={14} />Sign out</button></div>
      </header>
      <main className="dashboard-main" style={{ padding: 28, flex: 1, maxWidth: 1240, width: "100%", margin: "0 auto" }}><div key={page} className="page-transition">{children}</div></main>
    </div>
  </div>;
}
