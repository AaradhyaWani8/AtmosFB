import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Waves } from "lucide-react";
import { C, RADIUS, RISK } from "../data/climateData";

export function Container({ children, style }) {
  return <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", ...style }}>{children}</div>;
}

export function Eyebrow({ children, dark }) {
  return <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: dark ? "#B9B6AB" : C.green, marginBottom: 12 }}>{children}</div>;
}

export function Button({ children, variant = "primary", onClick, style, icon: Icon = ArrowRight, small, type = "button" }) {
  const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: RADIUS.pill, padding: small ? "10px 20px" : "14px 26px", fontWeight: 600, fontSize: small ? 12 : 12.5, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", transition: "all 0.22s ease", border: "1.5px solid transparent", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif" };
  const variants = {
    primary: { background: C.buttonBg, color: C.buttonText },
    secondary: { background: "transparent", color: C.charcoal, border: `1.5px solid ${C.charcoal}` },
    ghost: { background: "transparent", color: "#FFFFFF", border: "1.5px solid rgba(255,255,255,0.4)" },
  };
  const [hover, setHover] = useState(false);
  const hoverStyle = hover ? variant === "secondary" ? { background: C.buttonBg, color: C.buttonText, borderColor: C.buttonBg } : variant === "ghost" ? { background: "rgba(255,255,255,0.12)" } : { opacity: 0.85 } : {};
  return <button className="action-button" type={type} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ ...base, ...variants[variant], ...hoverStyle, ...style }}>{children}{Icon && <Icon size={13} />}</button>;
}

export function Card({ children, style, hover = false, onClick, dark }) {
  const [isHovered, setIsHovered] = useState(false);
  return <div className={hover || onClick ? "interactive-card" : ""} onClick={onClick} onMouseEnter={() => hover && setIsHovered(true)} onMouseLeave={() => hover && setIsHovered(false)} style={{ background: dark ? "#1F1F1D" : C.surface, border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : C.border}`, borderRadius: RADIUS.md, padding: 22, boxShadow: isHovered ? "0 10px 24px rgba(23,23,23,0.12)" : "0 1px 2px rgba(23,23,23,0.03)", transform: isHovered ? "translateY(-2px)" : "none", transition: "all 0.22s ease", cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>;
}

export function SectionHeading({ eyebrow, title, sub, dark, align = "left" }) {
  return <div style={{ textAlign: align, maxWidth: align === "center" ? 640 : 580, margin: align === "center" ? "0 auto 44px" : "0 0 44px" }}>{eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}<h2 style={{ fontWeight: 500, fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.15, letterSpacing: -0.5, color: dark ? "#F6F4EF" : C.charcoal, margin: 0 }}>{title}</h2>{sub && <p style={{ color: dark ? "#C7C4B8" : C.textMuted, fontSize: 15.5, lineHeight: 1.65, marginTop: 16 }}>{sub}</p>}</div>;
}

export function RiskIndicator({ risk, size = "md" }) {
  const value = RISK[risk];
  const fontSize = size === "sm" ? 11.5 : 13;
  const dotSize = size === "sm" ? 6 : 7;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: dotSize, height: dotSize, borderRadius: 999, background: value.color, flexShrink: 0 }} /><span style={{ fontWeight: 700, fontSize, color: value.color, letterSpacing: 0.3 }}>{size === "sm" ? value.short : value.label}</span></span>;
}

export function TrendArrow({ change }) {
  const up = change >= 0;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 600, color: up ? RISK.HIGH.color : C.green }}>{up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{Math.abs(change)}</span>;
}

export function PlaceholderArt({ tone = "beige", height = 320, icon: Icon = Waves, label }) {
  const tones = { beige: `linear-gradient(155deg, ${C.beige}, #F1EDE3)`, charcoal: `linear-gradient(155deg, #262622, ${C.charcoal})`, green: `linear-gradient(155deg, #7C8A72, ${C.green})`, white: `linear-gradient(155deg, #FFFFFF, ${C.beige})` };
  const light = tone !== "charcoal" && tone !== "green";
  return <div style={{ background: tones[tone], borderRadius: RADIUS.lg, height, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}><Icon size={30} strokeWidth={1.2} color={light ? C.charcoal : "#F6F4EF"} />{label && <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: light ? C.textMuted : "#D8D5CA" }}>{label}</div>}</div>;
}
