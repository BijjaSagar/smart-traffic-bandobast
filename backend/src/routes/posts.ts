import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { posts, postAssignments, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { emitToEvent } from "../lib/socket.js";

export const postsRouter = Router();
postsRouter.use(requireAuth);

const createPostSchema = z.object({
  eventId: z.number().int(),
  name: z.string().min(2),
  type: z.enum(["picket", "barricade", "checkpoint", "medical", "parking"]),
  lat: z.number(),
  lng: z.number(),
  geofenceRadiusM: z.number().int().positive().default(75),
  requiredStrength: z.number().int().positive().default(1),
});

// Add a picket / barricade / checkpoint to an event's duty chart — this IS the digital duty chart
postsRouter.post("/", requireRole("admin", "commander"), async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [post] = await db.insert(posts).values(parsed.data).returning();
  emitToEvent(parsed.data.eventId, "post:update", { type: "created", post });
  res.status(201).json({ post });
});

const assignSchema = z.object({
  userId: z.number().int(),
  shiftStart: z.string(),
  shiftEnd: z.string(),
});

// Assign an officer to a post for a shift
postsRouter.post("/:id/assign", requireRole("admin", "commander"), async (req, res) => {
  const postId = Number(req.params.id);
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const [assignment] = await db.insert(postAssignments).values({
    postId,
    userId: parsed.data.userId,
    shiftStart: new Date(parsed.data.shiftStart),
    shiftEnd: new Date(parsed.data.shiftEnd),
  }).returning();

  const [officer] = await db.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);

  emitToEvent(post.eventId, "post:update", {
    type: "assigned",
    postId,
    assignment: { ...assignment, userName: officer?.name, badgeNo: officer?.badgeNo },
  });

  res.status(201).json({ assignment });
});

// Officers assigned to me right now, across all live/planned events — powers the field-officer view
postsRouter.get("/mine", async (req, res) => {
  const rows = await db
    .select({
      assignmentId: postAssignments.id,
      shiftStart: postAssignments.shiftStart,
      shiftEnd: postAssignments.shiftEnd,
      post: posts,
    })
    .from(postAssignments)
    .innerJoin(posts, eq(postAssignments.postId, posts.id))
    .where(eq(postAssignments.userId, req.user!.id));

  res.json({ assignments: rows });
});
