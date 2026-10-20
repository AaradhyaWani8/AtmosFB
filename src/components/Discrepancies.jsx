import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/http";
import { C } from "../data/climateData";
import { Button, Card, SectionHeading } from "./ui";

const fieldStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.charcoal, font: "inherit" };

export default function Discrepancies({ user, location }) {
  const [reports, setReports] = useState([]);
  const [category, setCategory] = useState("temperature");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await apiRequest("/discrepancies?limit=100");
      if (!Array.isArray(result)) throw new Error("The API returned an invalid discrepancy list.");
      setReports(result);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => apiRequest("/discrepancies?limit=100")
      .then((result) => {
        if (!Array.isArray(result)) throw new Error("The API returned an invalid discrepancy list.");
        if (active) { setReports(result); setError(""); }
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    load();
    const interval = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest("/discrepancies", { method: "POST", body: { location, category, description, observedAt: new Date().toISOString() } });
      setDescription("");
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const review = async (id, action) => {
    setError("");
    try {
      await apiRequest(`/discrepancies/${id}/${action}`, { method: "POST", body: {} });
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <div>
    <SectionHeading eyebrow="Overview" title="Discrepancy reports" sub={user.role === "admin" ? "Review reports submitted by Atmos users." : "Report an observed difference and track your submissions here."} />
    {user.role === "user" && <Card style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>Submit a discrepancy</h3>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Category<select value={category} onChange={(event) => setCategory(event.target.value)} style={fieldStyle}><option value="temperature">Temperature</option><option value="humidity">Humidity</option><option value="station">Weather station</option><option value="other">Other</option></select></label>
        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>What did you observe in {location}?<textarea value={description} onChange={(event) => setDescription(event.target.value)} style={{ ...fieldStyle, minHeight: 90, resize: "vertical" }} required maxLength={4000} /></label>
        <div><Button type="submit" small icon={null}>{busy ? "Submitting..." : "Submit report"}</Button></div>
      </form>
    </Card>}
    {error && <p role="alert" style={{ color: "#A73A2F" }}>{error}</p>}
    {reports.length === 0 ? <Card>No discrepancy reports yet.</Card> : <div style={{ display: "grid", gap: 12 }}>
      {reports.map((report) => <Card key={report._id}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <strong>{report.category} · {report.location}</strong>
          <span style={{ textTransform: "capitalize", color: report.status === "pending" ? "#B98A2E" : C.green, fontWeight: 700 }}>{report.status}</span>
        </div>
        <p style={{ color: C.textMuted, lineHeight: 1.6 }}>{report.description}</p>
        <div style={{ fontSize: 12, color: C.textFaint }}>Observed {new Date(report.observedAt).toLocaleString()} · Submitted {new Date(report.createdAt).toLocaleString()}{user.role === "admin" && report.submittedBy?.email ? ` · ${report.submittedBy.name} (${report.submittedBy.email})` : ""}</div>
        {report.reviewNote && <div style={{ marginTop: 8, fontSize: 13 }}>Review note: {report.reviewNote}</div>}
        {user.role === "admin" && report.status === "pending" && <div style={{ display: "flex", gap: 8, marginTop: 14 }}><Button small icon={null} onClick={() => review(report._id, "approve")}>Approve</Button><Button small variant="secondary" icon={null} onClick={() => review(report._id, "reject")}>Reject</Button></div>}
      </Card>)}
    </div>}
  </div>;
}
