import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { watchlistEntries, checkpointLogs, posts } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { emitToEvent } from "../lib/socket.js";

export const checkpointsRouter = Router();
checkpointsRouter.use(requireAuth);

// --- Watchlist management (commander/admin) ---

const addWatchlistSchema = z.object({
  vehicleNumber: z.string().min(4).max(20),
  reason: z.string().min(2),
  severity: z.enum(["alert", "hold"]).default("alert"),
});

function normalizePlate(v: string) {
  return v.toUpperCase().replace(/\s+/g, "");
}

checkpointsRouter.post("/watchlist", requireRole("admin", "commander"), async (req, res) => {
  const parsed = addWatchlistSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const [entry] = await db.insert(watchlistEntries).values({
    vehicleNumber: normalizePlate(d.vehicleNumber),
    reason: d.reason,
    severity: d.severity,
    addedBy: req.user!.id,
  }).returning();

  res.status(201).json({ entry });
});

checkpointsRouter.get("/watchlist", requireRole("admin", "commander"), async (_req, res) => {
  const rows = await db.select().from(watchlistEntries).orderBy(desc(watchlistEntries.createdAt));
  res.json({ entries: rows });
});

// --- Module 8: Digital Nakabandi & Vehicle Verification ---
// Checkpoint officer enters (or, with a plate-reader camera later, scans) a
// vehicle number; the system checks it against the watchlist instantly and
// logs the outcome — replacing the paper nakabandi register with a
// searchable record and immediate go/hold guidance.

const checkVehicleSchema = z.object({ vehicleNumber: z.string().min(2).max(20) });

checkpointsRouter.post("/:postId/check", async (req, res) => {
  const postId = Number(req.params.postId);
  const parsed = checkVehicleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) return res.status(404).json({ error: "Checkpoint post not found" });

  const plate = normalizePlate(parsed.data.vehicleNumber);
  const matches = await db.select().from(watchlistEntries).where(eq(watchlistEntries.vehicleNumber, plate));
  const match = matches[0];

  const outcome = !match ? "clear" : match.severity === "hold" ? "hold" : "flagged";

  const [log] = await db.insert(checkpointLogs).values({
    postId,
    vehicleNumber: plate,
    matchedWatchlistEntryId: match?.id,
    outcome,
    checkedBy: req.user!.id,
  }).returning();

  if (outcome !== "clear") {
    emitToEvent(post.eventId, "checkpoint:hit", { postId, log, matchReason: match?.reason, severity: match?.severity });
  }

  res.status(201).json({ log, outcome, matchReason: match?.reason ?? null });
});

checkpointsRouter.get("/:postId/logs", async (req, res) => {
  const postId = Number(req.params.postId);
  const rows = await db.select().from(checkpointLogs)
    .where(eq(checkpointLogs.postId, postId)).orderBy(desc(checkpointLogs.checkedAt)).limit(200);
  res.json({ logs: rows });
});
