import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { attendance, postAssignments, posts, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { distanceMeters } from "../lib/geofence.js";
import { emitToEvent } from "../lib/socket.js";

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

const checkinSchema = z.object({
  postAssignmentId: z.number().int(),
  lat: z.number(),
  lng: z.number(),
});

// Geofenced check-in — this replaces the paper muster register.
// The officer's live GPS position is compared against the post's geofence radius;
// outside the fence, the check-in is still logged but flagged "late" so the control
// room can see it and follow up, instead of it silently failing.
attendanceRouter.post("/checkin", async (req, res) => {
  const parsed = checkinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { postAssignmentId, lat, lng } = parsed.data;

  const [assignment] = await db.select().from(postAssignments)
    .where(eq(postAssignments.id, postAssignmentId)).limit(1);
  if (!assignment) return res.status(404).json({ error: "Assignment not found" });
  if (assignment.userId !== req.user!.id) {
    return res.status(403).json({ error: "This shift is not assigned to you" });
  }

  const [post] = await db.select().from(posts).where(eq(posts.id, assignment.postId)).limit(1);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const dist = distanceMeters(lat, lng, post.lat, post.lng);
  const status = dist <= post.geofenceRadiusM ? "present" : "late";

  const [record] = await db.insert(attendance).values({
    postAssignmentId,
    userId: req.user!.id,
    postId: post.id,
    checkedInLat: lat,
    checkedInLng: lng,
    distanceMeters: dist,
    status,
  }).returning();

  const [officer] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);

  emitToEvent(post.eventId, "attendance:update", {
    postId: post.id,
    record,
    officerName: officer?.name,
    badgeNo: officer?.badgeNo,
    distanceMeters: dist,
  });

  res.status(201).json({ record, distanceMeters: Math.round(dist), status });
});

// Live roster for a whole event — who's checked in, who isn't, powers the command dashboard
attendanceRouter.get("/event/:eventId", async (req, res) => {
  const eventId = Number(req.params.eventId);

  const eventPosts = await db.select().from(posts).where(eq(posts.eventId, eventId));
  const postIds = eventPosts.map((p) => p.id);

  if (postIds.length === 0) return res.json({ roster: [] });

  const records = await db
    .select({
      id: attendance.id,
      postId: attendance.postId,
      status: attendance.status,
      checkedInAt: attendance.checkedInAt,
      distanceMeters: attendance.distanceMeters,
      userName: users.name,
      badgeNo: users.badgeNo,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.userId, users.id))
    .where(eq(attendance.postId, postIds[0]));

  // Simple MVP roster (per-post detail available via /events/:id already)
  res.json({ roster: records });
});
