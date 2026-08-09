import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { convoys, convoyWaypoints } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { emitToEvent } from "../lib/socket.js";

export const convoysRouter = Router();
convoysRouter.use(requireAuth);

const createConvoySchema = z.object({
  eventId: z.number().int(),
  label: z.string().min(2),
  waypoints: z.array(z.object({
    junctionName: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    preAlertMinutes: z.number().int().positive().default(5),
  })).min(1),
});

// Module 7 — Green Corridor / VIP Movement Automation.
// A convoy is a planned route of junctions; starting it and advancing it
// through waypoints pre-alerts the *next* junction picket, giving the
// human officer time to prepare a hold/release instead of a same-second
// phone call — the automation ends at "alert the picket", the actual
// signal control stays a human decision, deliberately.
convoysRouter.post("/", requireRole("admin", "commander"), async (req, res) => {
  const parsed = createConvoySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const [convoy] = await db.insert(convoys).values({ eventId: d.eventId, label: d.label }).returning();

  const waypointRows = await db.insert(convoyWaypoints).values(
    d.waypoints.map((w, i) => ({
      convoyId: convoy.id,
      sequence: i,
      junctionName: w.junctionName,
      lat: w.lat,
      lng: w.lng,
      preAlertMinutes: w.preAlertMinutes,
    }))
  ).returning();

  res.status(201).json({ convoy, waypoints: waypointRows });
});

convoysRouter.get("/event/:eventId", async (req, res) => {
  const eventId = Number(req.params.eventId);
  const rows = await db.select().from(convoys).where(eq(convoys.eventId, eventId));
  const withWaypoints = await Promise.all(rows.map(async (c) => ({
    ...c,
    waypoints: await db.select().from(convoyWaypoints)
      .where(eq(convoyWaypoints.convoyId, c.id)).orderBy(asc(convoyWaypoints.sequence)),
  })));
  res.json({ convoys: withWaypoints });
});

convoysRouter.post("/:id/start", requireRole("admin", "commander"), async (req, res) => {
  const id = Number(req.params.id);
  const [convoy] = await db.update(convoys)
    .set({ status: "active", startedAt: new Date(), currentWaypointIndex: 0 })
    .where(eq(convoys.id, id)).returning();
  if (!convoy) return res.status(404).json({ error: "Convoy not found" });

  const [firstWaypoint] = await db.select().from(convoyWaypoints)
    .where(eq(convoyWaypoints.convoyId, id)).orderBy(asc(convoyWaypoints.sequence)).limit(1);

  emitToEvent(convoy.eventId, "convoy:update", { convoy, alertWaypoint: firstWaypoint });
  res.json({ convoy, alertWaypoint: firstWaypoint });
});

// Advances the convoy to the next waypoint — called by the control room as
// the convoy physically passes each junction (or in future, automatically
// once GPS convoy tracking is wired in). Pre-alerts the *following*
// junction so its picket has advance notice.
convoysRouter.post("/:id/advance", requireRole("admin", "commander"), async (req, res) => {
  const id = Number(req.params.id);
  const [convoy] = await db.select().from(convoys).where(eq(convoys.id, id)).limit(1);
  if (!convoy) return res.status(404).json({ error: "Convoy not found" });

  const waypoints = await db.select().from(convoyWaypoints)
    .where(eq(convoyWaypoints.convoyId, id)).orderBy(asc(convoyWaypoints.sequence));

  const currentIdx = convoy.currentWaypointIndex;
  if (currentIdx >= 0 && currentIdx < waypoints.length) {
    await db.update(convoyWaypoints).set({ reachedAt: new Date() }).where(eq(convoyWaypoints.id, waypoints[currentIdx].id));
  }

  const nextIdx = currentIdx + 1;
  const isComplete = nextIdx >= waypoints.length;

  const [updated] = await db.update(convoys).set({
    currentWaypointIndex: nextIdx,
    status: isComplete ? "completed" : "active",
    completedAt: isComplete ? new Date() : undefined,
  }).where(eq(convoys.id, id)).returning();

  const alertWaypoint = isComplete ? null : waypoints[nextIdx];
  emitToEvent(convoy.eventId, "convoy:update", { convoy: updated, alertWaypoint });
  res.json({ convoy: updated, alertWaypoint, isComplete });
});
