import { Router } from "express";
import { db } from "../db/client.js";
import { events, posts } from "../db/schema.js";
import { eq, and, ne, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const plannerRouter = Router();
plannerRouter.use(requireAuth);

/**
 * Module 1 — AI Deployment Planner.
 *
 * Honest description of what this is: a rule-based suggestion engine, not a
 * trained ML model. It looks at every *other* past event held at the same
 * venue, pools the duty posts that were actually deployed there, and groups
 * near-duplicate posts (same name/type, close together) into one suggestion
 * with an averaged required strength. A commander planning next year's yatra
 * at a venue used before gets a starting duty chart in one click instead of
 * a blank map — which is the actual proposal claim ("learns from past
 * deployments at the same venue to refine suggested strengths").
 *
 * This deliberately does NOT call out to any external AI/ML service — it's
 * plain SQL aggregation over your own historical data, which is both more
 * auditable for a police deployment and has zero external dependency.
 */
plannerRouter.get("/venue-suggestions", requireRole("admin", "commander"), async (req, res) => {
  const venueName = req.query.venueName as string | undefined;
  const excludeEventId = req.query.excludeEventId ? Number(req.query.excludeEventId) : undefined;

  if (!venueName) return res.status(400).json({ error: "venueName is required" });

  const pastEvents = await db.select().from(events).where(
    excludeEventId
      ? and(eq(events.venueName, venueName), ne(events.id, excludeEventId))
      : eq(events.venueName, venueName)
  );

  if (pastEvents.length === 0) {
    return res.json({ suggestions: [], basedOnEvents: 0, note: "No past events at this venue yet." });
  }

  const eventIds = pastEvents.map((e) => e.id);
  const pastPosts = await db.select().from(posts).where(
    sql`${posts.eventId} IN (${sql.join(eventIds.map((id) => sql`${id}`), sql`, `)})`
  );

  // Group posts by name+type — a simple key, since commanders reuse post
  // names like "Picket 1 — Laxmi Road Junction" year over year.
  const groups = new Map<string, typeof pastPosts>();
  for (const p of pastPosts) {
    const key = `${p.name.trim().toLowerCase()}::${p.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const suggestions = Array.from(groups.values()).map((group) => {
    const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
    return {
      name: group[0].name,
      type: group[0].type,
      lat: avg(group.map((g) => g.lat)),
      lng: avg(group.map((g) => g.lng)),
      geofenceRadiusM: Math.round(avg(group.map((g) => g.geofenceRadiusM))),
      suggestedStrength: Math.round(avg(group.map((g) => g.requiredStrength))),
      seenInPastEvents: group.length,
    };
  });

  res.json({
    suggestions,
    basedOnEvents: pastEvents.length,
    note: `Based on ${pastEvents.length} past event(s) at "${venueName}". Review before accepting — this is a starting point, not a substitute for the commander's judgment.`,
  });
});
