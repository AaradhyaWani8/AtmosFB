import { useEffect, useState } from "react";
import { ArrowLeft, Thermometer } from "lucide-react";
import { C, RADIUS } from "../data/climateData";
import { apiRequest } from "../services/http";
import { Button, Card, Eyebrow } from "./ui";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: RADIUS.md,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.charcoal,
  font: "inherit",
};

export default function AuthPage({ onAuthenticated, onBack }) {
  const [role, setRole] = useState("user");
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminBootstrapAvailable, setAdminBootstrapAvailable] = useState(false);

  useEffect(() => {
    if (role !== "admin") return undefined;
    let active = true;
    apiRequest("/auth/admin-bootstrap")
      .then((result) => { if (active) setAdminBootstrapAvailable(result.available); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [role]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const isRegistration = mode === "register" || mode === "admin-register";
      const endpoint = mode === "admin-register" ? "/auth/admin-bootstrap" : mode === "register" ? "/auth/register" : "/auth/login";
      const result = await apiRequest(endpoint, {
        method: "POST",
        body: isRegistration ? { name, email, password } : { email, password },
        token: null,
      });
      if (mode === "login" && result.user.role !== role) {
        setError(`This account has the ${result.user.role} role. Select the matching sign-in tab.`);
        await apiRequest("/auth/logout", { method: "POST", token: result.token });
        return;
      }
      localStorage.setItem("atmosToken", result.token);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: C.bg, color: C.charcoal, fontFamily: "Inter, sans-serif" }}>
      <Card style={{ width: "min(100%, 430px)", boxSizing: "border-box" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: 0, padding: 0, marginBottom: 24, color: C.textMuted, cursor: "pointer" }}><ArrowLeft size={15} /> Back to Atmos</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}><Thermometer size={22} color={C.green} /><strong style={{ letterSpacing: 2 }}>ATMOS</strong></div>
        <Eyebrow>Secure account access</Eyebrow>
        <h1 style={{ margin: "0 0 20px", fontSize: 28, fontWeight: 500 }}>{mode === "register" ? "Create a user account" : mode === "admin-register" ? "Set up the first admin" : "Sign in to Atmos"}</h1>
        <div role="tablist" aria-label="Account role" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 4, gap: 4, marginBottom: 20, background: C.bg, borderRadius: RADIUS.md }}>
          {["user", "admin"].map((value) => <button key={value} role="tab" aria-selected={role === value} onClick={() => { setRole(value); setMode("login"); setError(""); }} style={{ padding: 10, border: 0, borderRadius: RADIUS.md, cursor: "pointer", background: role === value ? C.buttonBg : "transparent", color: role === value ? C.buttonText : C.textMuted, fontWeight: 600, textTransform: "capitalize" }}>{value} login</button>)}
        </div>
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          {mode !== "login" && <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Name<input style={inputStyle} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} /></label>}
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Email<input style={inputStyle} type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Password<input style={inputStyle} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode !== "login" ? 12 : undefined} /></label>
          {role === "admin" && <p style={{ margin: 0, color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>{adminBootstrapAvailable ? "No administrator exists yet. You can set up the first admin account here; setup closes automatically after it is claimed." : "Admin access is verified by your account role. Selecting this tab does not grant administrator privileges."}</p>}
          {error && <p role="alert" style={{ margin: 0, color: "#A73A2F", fontSize: 13 }}>{error}</p>}
          <Button type="submit" style={{ width: "100%", marginTop: 4 }} icon={null}>{busy ? "Please wait..." : mode === "admin-register" ? "Create first admin" : mode === "register" ? "Create account" : `Sign in as ${role}`}</Button>
        </form>
        {role === "user" && <p style={{ color: C.textMuted, fontSize: 13, textAlign: "center", margin: "20px 0 0" }}>{mode === "register" ? "Already registered?" : "New to Atmos?"}{" "}<button onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }} style={{ border: 0, background: "none", color: C.green, cursor: "pointer", fontWeight: 700 }}>{mode === "register" ? "Sign in" : "Create a user account"}</button></p>}
        {role === "admin" && mode !== "admin-register" && adminBootstrapAvailable && <p style={{ color: C.textMuted, fontSize: 13, textAlign: "center", margin: "20px 0 0" }}>First time setting up Atmos?{" "}<button onClick={() => { setMode("admin-register"); setError(""); }} style={{ border: 0, background: "none", color: C.green, cursor: "pointer", fontWeight: 700 }}>Create the first admin</button></p>}
        {role === "admin" && mode === "admin-register" && <p style={{ color: C.textMuted, fontSize: 13, textAlign: "center", margin: "20px 0 0" }}><button onClick={() => { setMode("login"); setError(""); }} style={{ border: 0, background: "none", color: C.green, cursor: "pointer", fontWeight: 700 }}>Back to admin login</button></p>}
      </Card>
    </main>
  );
}
