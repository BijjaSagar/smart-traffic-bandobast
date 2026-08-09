import { Router } from "express";
import { db } from "../db/client.js";
import { events } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

export const riskRouter = Router();
riskRouter.use(requireAuth);

// WMO weather codes -> plain-English + whether it's precipitation-relevant.
// https://open-meteo.com/en/docs (WMO Weather interpretation codes)
function describeWeatherCode(code: number): { label: string; risky: boolean } {
  if (code === 0) return { label: "Clear sky", risky: false };
  if ([1, 2, 3].includes(code)) return { label: "Partly cloudy", risky: false };
  if ([45, 48].includes(code)) return { label: "Fog", risky: true };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Drizzle", risky: true };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rain", risky: true };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", risky: true };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", risky: true };
  return { label: "Unknown conditions", risky: false };
}

/**
 * Module 12 — Weather & Calendar Risk Scoring.
 *
 * Real integration, not a stub: calls Open-Meteo's free forecast API (no key
 * required) for the venue's exact coordinates and the event's date, then
 * combines that with expected footfall and event type into a plain-English
 * risk band. This is a heuristic scoring function, not a trained model — the
 * weights below are a reasonable starting point for a commander to sanity-
 * check against, not a guarantee.
 */
riskRouter.get("/events/:id", async (req, res) => {
  const eventId = Number(req.params.id);
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return res.status(404).json({ error: "Event not found" });

  const reasons: string[] = [];
  let score = 0; // 0-100, higher = more caution warranted

  // Footfall contribution
  const footfall = event.expectedFootfall ?? 0;
  if (footfall >= 50000) { score += 35; reasons.push(`Very large expected footfall (${footfall.toLocaleString()}).`); }
  else if (footfall >= 10000) { score += 20; reasons.push(`Large expected footfall (${footfall.toLocaleString()}).`); }
  else if (footfall >= 1000) { score += 8; reasons.push(`Moderate expected footfall (${footfall.toLocaleString()}).`); }

  // Event type contribution — processions/festivals concentrate crowds more
  // than e.g. a routine VIP visit with controlled access.
  const highRiskTypes = ["festival", "procession", "election"];
  if (highRiskTypes.includes(event.eventType)) {
    score += 15;
    reasons.push(`Event type "${event.eventType.replace("_", " ")}" typically involves less controlled crowd movement.`);
  }

  // Weather contribution — best effort; if the upstream API is unreachable
  // or the event is too far in the future for a forecast, we say so plainly
  // instead of pretending we have data we don't.
  let weather: { label: string; tempMaxC: number; precipProbability: number } | null = null;
  try {
    const daysOut = Math.ceil((event.startAt.getTime() - Date.now()) / (24 * 3600 * 1000));
    if (daysOut >= 0 && daysOut <= 15) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${event.venueLat}&longitude=${event.venueLng}` +
        `&daily=precipitation_probability_max,temperature_2m_max,weathercode&timezone=Asia%2FKolkata&forecast_days=16`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json() as any;
        const idx = Math.min(daysOut, (data.daily?.time?.length ?? 1) - 1);
        if (idx >= 0 && data.daily) {
          const code = data.daily.weathercode[idx];
          const { label, risky } = describeWeatherCode(code);
          const precipProbability = data.daily.precipitation_probability_max[idx];
          weather = {
            label,
            tempMaxC: data.daily.temperature_2m_max[idx],
            precipProbability,
          };
          if (risky || precipProbability >= 50) {
            score += 20;
            reasons.push(`Forecast: ${label.toLowerCase()}, ${precipProbability}% chance of precipitation — factor this into crowd shelter and route planning.`);
          } else {
            reasons.push(`Forecast: ${label.toLowerCase()}, ${precipProbability}% chance of precipitation.`);
          }
        }
      }
    } else if (daysOut > 15) {
      reasons.push("Event is more than 15 days out — too far ahead for a reliable weather forecast yet. Recheck closer to the date.");
    }
  } catch {
    reasons.push("Weather forecast temporarily unavailable — proceed with manpower/footfall assessment only.");
  }

  score = Math.min(score, 100);
  const band = score >= 55 ? "high" : score >= 30 ? "medium" : "low";

  res.json({
    eventId,
    riskScore: score,
    riskBand: band,
    weather,
    reasons,
    note: "Heuristic score from footfall, event type and weather — a planning aid, not a substitute for the commander's on-ground assessment.",
  });
});
