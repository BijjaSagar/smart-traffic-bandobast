import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { events, posts, postAssignments, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

const createEventSchema = z.object({
  title: z.string().min(2),
  eventType: z.string().min(2),
  venueName: z.string().min(2),
  venueLat: z.number(),
  venueLng: z.number(),
  startAt: z.string(),
  endAt: z.string(),
  expectedFootfall: z.number().int().positive().optional(),
});

// List all events (most recent first)
eventsRouter.get("/", async (_req, res) => {
  const rows = await db.select().from(events).orderBy(events.startAt);
  res.json({ events: rows });
});

// Create a new bandobast event — commander/admin only
eventsRouter.post("/", requireRole("admin", "commander"), async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const [event] = await db.insert(events).values({
    title: d.title,
    eventType: d.eventType,
    venueName: d.venueName,
    venueLat: d.venueLat,
    venueLng: d.venueLng,
    startAt: new Date(d.startAt),
    endAt: new Date(d.endAt),
    expectedFootfall: d.expectedFootfall,
    createdBy: req.user!.id,
  }).returning();

  res.status(201).json({ event });
});

// Full event detail — venue + posts + who is assigned to each post
eventsRouter.get("/:id", async (req, res) => {
  const eventId = Number(req.params.id);
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return res.status(404).json({ error: "Event not found" });

  const postRows = await db.select().from(posts).where(eq(posts.eventId, eventId));

  const assignments = await db
    .select({
      id: postAssignments.id,
      postId: postAssignments.postId,
      shiftStart: postAssignments.shiftStart,
      shiftEnd: postAssignments.shiftEnd,
      userId: users.id,
      userName: users.name,
      badgeNo: users.badgeNo,
    })
    .from(postAssignments)
    .innerJoin(users, eq(postAssignments.userId, users.id))
    .where(eq(postAssignments.postId, postRows[0]?.id ?? -1));

  // For events with multiple posts, fetch assignments per post (kept simple for MVP clarity)
  const allAssignments = postRows.length
    ? await db
        .select({
          id: postAssignments.id,
          postId: postAssignments.postId,
          shiftStart: postAssignments.shiftStart,
          shiftEnd: postAssignments.shiftEnd,
          userId: users.id,
          userName: users.name,
          badgeNo: users.badgeNo,
        })
        .from(postAssignments)
        .innerJoin(users, eq(postAssignments.userId, users.id))
    : [];

  const postsWithAssignments = postRows.map((p) => ({
    ...p,
    assignments: allAssignments.filter((a) => a.postId === p.id),
  }));

  res.json({ event, posts: postsWithAssignments });
});

eventsRouter.patch("/:id/status", requireRole("admin", "commander"), async (req, res) => {
  const eventId = Number(req.params.id);
  const status = z.enum(["planned", "live", "completed"]).parse(req.body.status);
  const [event] = await db.update(events).set({ status }).where(eq(events.id, eventId)).returning();
  res.json({ event });
});
