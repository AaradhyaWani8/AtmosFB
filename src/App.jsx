import { useEffect, useState } from "react";
import AppShell from "./components/AppShell";
import AuthPage from "./components/AuthPage";
import Discrepancies from "./components/Discrepancies";
import MarketingSite from "./components/MarketingSite";
import { About, AIInsights, Analytics, Recommendations, RiskMap } from "./components/DashboardPages";
import { Dashboard, Monitoring, Prediction, Warnings } from "./components/LivePages";
import { applyTheme } from "./data/climateData";
import { apiRequest } from "./services/http";

export default function App() {
  const [inApp, setInApp] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [location, setLocation] = useState("Pune");
  const [theme, setTheme] = useState("light");
  const [user, setUser] = useState(null);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem("atmosToken");
    if (!token) return;
    apiRequest("/auth/me")
      .then((profile) => setUser(profile))
      .catch(() => localStorage.removeItem("atmosToken"));
  }, []);

  const openDashboard = (target) => {
    setInApp(true);
    if (target) setPage(target.toLowerCase().replace(" ", ""));
  };

  const logout = async () => {
    try {
      if (localStorage.getItem("atmosToken")) await apiRequest("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Atmos logout failed:", error);
    } finally {
      localStorage.removeItem("atmosToken");
      setUser(null);
      setInApp(false);
      setPage("dashboard");
    }
  };

  const pages = {
    dashboard: <Dashboard key={location} location={location} setPage={setPage} />,
    discrepancies: <Discrepancies key={location} location={location} user={user} />,
    monitoring: <Monitoring key={location} location={location} user={user} />,
    prediction: <Prediction key={location} location={location} user={user} />,
    riskmap: <RiskMap location={location} setLocation={setLocation} setPage={setPage} />,
    warnings: <Warnings key={location} location={location} user={user} />,
    analytics: <Analytics location={location} />,
    ai: <AIInsights key={location} location={location} />,
    recommendations: <Recommendations />,
    about: <About />,
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  return !inApp
    ? <MarketingSite onOpenDashboard={openDashboard} onLogin={() => setInApp(true)} theme={theme} onToggleTheme={toggleTheme} />
    : user
      ? <AppShell page={page} setPage={setPage} location={location} setLocation={setLocation} user={user} onLogout={logout} onExit={() => setInApp(false)} theme={theme} onToggleTheme={toggleTheme}>{pages[page] || pages.dashboard}</AppShell>
      : <AuthPage onAuthenticated={(profile) => { setUser(profile); setPage("dashboard"); }} onBack={() => setInApp(false)} />;
}
