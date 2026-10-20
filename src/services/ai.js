import { GoogleGenAI } from "@google/genai";
import { LOCATION_DATA, PERSONA_CONTEXT, RISK } from "../data/climateData";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
export const isAiConfigured = Boolean(GEMINI_API_KEY);

export function localAiAnswer(question, location, persona = "Citizen") {
  const data = LOCATION_DATA[location];
  const query = question.toLowerCase();
  if (query.includes("peak") || query.includes("maximum") || query.includes("hottest")) return `Temperatures in ${location} are expected to peak near ${data.maxTemp}°C during the next 48 hours.`;
  if (query.includes("water") || query.includes("drink") || query.includes("hydrate")) return `For ${location}'s current ${data.heatIndex}°C heat index, drink water regularly, take cooling breaks, and increase fluids during outdoor activity. Seek help if you feel dizzy, confused, or unusually weak.`;
  const audience = persona === "Farmer" ? " Adjust irrigation and avoid strenuous field work during peak heat." : persona === "Health Department" ? " Prepare cooling shelters and monitor vulnerable residents." : persona === "Local Authorities" ? " Prioritize public alerts and coordinated heat response." : " Stay hydrated and limit direct sun exposure.";
  if (query.includes("tomorrow") || query.includes("heatwave")) return `There is an ${data.probability}% probability of heatwave conditions developing near ${location} within the next 48 hours. Peak temperature may reach ${data.maxTemp}°C.${audience}`;
  if (query.includes("highest risk") || query.includes("area") || query.includes("region")) return `${location} currently shows a ${data.probability}% heatwave probability, classified as ${RISK[data.risk].label}.`;
  if (query.includes("precaution") || query.includes("safe") || query.includes("protect")) return `For ${persona}: Stay hydrated, avoid direct sun between 12 and 4 PM, wear light breathable clothing, and check on elderly family members during peak heat hours.${audience}`;
  if (query.includes("why") || query.includes("increasing") || query.includes("cause")) return `Risk is rising mainly due to a temperature anomaly of about ${(data.temp - 33).toFixed(1)}°C above the seasonal average, low humidity, and weak wind circulation around ${location}.`;
  return `Current conditions in ${location}: ${data.temp}°C, feels like ${data.feels}°C. ${RISK[data.risk].label}, with ${data.probability}% heatwave probability over the next 48 hours.${audience}`;
}

export async function answerWithAi(question, location, persona = "Citizen") {
  if (!ai) return localAiAnswer(question, location, persona);
  try {
    const request = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a concise heatwave safety assistant. Answer the question directly in 2-4 sentences. Tailor the advice to this stakeholder: ${persona}. Focus guidance on their responsibilities and decisions. Use the current ${location} climate context below. Always provide a useful action or concrete value when the data supports it. Never say that the data does not specify something if a reasonable safety recommendation can be made. Do not invent medical advice.\n\nQuestion: ${question}\n\nStakeholder context: ${PERSONA_CONTEXT[persona]}\n\nCurrent ${location} data: ${JSON.stringify(LOCATION_DATA[location])}`,
    });
    const response = await Promise.race([request, new Promise((_, reject) => setTimeout(() => reject(new Error("AI request timed out")), 15000))]);
    return response.text?.trim() || localAiAnswer(question, location, persona);
  } catch (error) {
    console.error("Gemini API error:", error);
    return `${localAiAnswer(question, location, persona)}\n\nLive AI is unavailable right now, so this answer uses the local climate model.`;
  }
}
