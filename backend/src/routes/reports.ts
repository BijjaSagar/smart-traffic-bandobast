import { Router } from "express";
import { db } from "../db/client.js";
import { events, posts, postAssignments, attendance, sosAlerts, users } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

/**
 * Module 11 — After-Action Analytics & Report Generator.
 *
 * Aggregates everything the system already recorded during the event —
 * manpower deployed vs. planned, attendance timeliness, SOS response times —
 * into the structured report a commander currently has to reconstruct from
 * memory. No new data collection here; this is entirely built from the
 * duty-chart, attendance and SOS modules already running.
 */
reportsRouter.get("/events/:id", async (req, res) => {
  const eventId = Number(req.params.id);
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return res.status(404).json({ error: "Event not found" });

  const eventPosts = await db.select().from(posts).where(eq(posts.eventId, eventId));
  const postIds = eventPosts.map((p) => p.id);

  const assignments = postIds.length
    ? await db.select().from(postAssignments).where(inArray(postAssignments.postId, postIds))
    : [];

  const attendanceRows = postIds.length
    ? await db.select().from(attendance).where(inArray(attendance.postId, postIds))
    : [];

  const sosRows = await db.select().from(sosAlerts).where(eq(sosAlerts.eventId, eventId));

  // Manpower: planned (sum of requiredStrength) vs. deployed (assignments) vs. actually present
  const totalRequired = eventPosts.reduce((sum, p) => sum + p.requiredStrength, 0);
  const totalAssigned = assignments.length;
  const totalPresent = attendanceRows.filter((a) => a.status === "present").length;
  const totalLate = attendanceRows.filter((a) => a.status === "late").length;
  const noShowCount = Math.max(totalAssigned - attendanceRows.length, 0);

  // Post-by-post fill rate, most useful part for planning next year's chart
  const postBreakdown = eventPosts.map((p) => {
    const assignedHere = assignments.filter((a) => a.postId === p.id).length;
    const presentHere = attendanceRows.filter((a) => a.postId === p.id && a.status !== "absent").length;
    return {
      postId: p.id,
      name: p.name,
      type: p.type,
      required: p.requiredStrength,
      assigned: assignedHere,
      checkedIn: presentHere,
      fillRate: p.requiredStrength > 0 ? Math.round((presentHere / p.requiredStrength) * 100) : null,
    };
  });

  const avgDistanceMeters = attendanceRows.length
    ? Math.round(attendanceRows.reduce((s, a) => s + a.distanceMeters, 0) / attendanceRows.length)
    : null;

  // SOS response times
  const sosWithAck = sosRows.filter((s) => s.acknowledgedAt);
  const avgAckSeconds = sosWithAck.length
    ? Math.round(
        sosWithAck.reduce((sum, s) => sum + (s.acknowledgedAt!.getTime() - s.createdAt.getTime()) / 1000, 0) /
          sosWithAck.length
      )
    : null;
  const sosWithResolve = sosRows.filter((s) => s.resolvedAt);
  const avgResolveSeconds = sosWithResolve.length
    ? Math.round(
        sosWithResolve.reduce((sum, s) => sum + (s.resolvedAt!.getTime() - s.createdAt.getTime()) / 1000, 0) /
          sosWithResolve.length
      )
    : null;

  res.json({
    event: { id: event.id, title: event.title, venueName: event.venueName, status: event.status,
      startAt: event.startAt, endAt: event.endAt, expectedFootfall: event.expectedFootfall },
    manpower: {
      totalRequired, totalAssigned, totalPresent, totalLate, noShowCount,
      overallFillRate: totalRequired > 0 ? Math.round((totalPresent / totalRequired) * 100) : null,
      avgCheckInDistanceMeters: avgDistanceMeters,
    },
    postBreakdown,
    sos: {
      total: sosRows.length,
      resolved: sosRows.filter((s) => s.status === "resolved").length,
      stillOpen: sosRows.filter((s) => s.status === "open").length,
      avgAckSeconds, avgResolveSeconds,
      drillCount: sosRows.filter((s) => s.isDrill).length,
    },
  });
});
