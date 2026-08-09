import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { sosAlerts, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { emitToEvent } from "../lib/socket.js";

export const sosRouter = Router();
sosRouter.use(requireAuth);

const createSosSchema = z.object({
  eventId: z.number().int(),
  lat: z.number(),
  lng: z.number(),
  note: z.string().max(280).optional(),
  isDrill: z.boolean().optional(),
});

// One-tap panic button. Deliberately minimal payload — a distressed officer needs
// this to work with one thumb in under two seconds.
sosRouter.post("/", async (req, res) => {
  const parsed = createSosSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const [alert] = await db.insert(sosAlerts).values({
    eventId: d.eventId,
    userId: req.user!.id,
    lat: d.lat,
    lng: d.lng,
    note: d.note,
    isDrill: d.isDrill ?? false,
  }).returning();

  const [officer] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);

  emitToEvent(d.eventId, "sos:new", {
    alert,
    officerName: officer?.name,
    badgeNo: officer?.badgeNo,
    officerPhone: officer?.phone,
  });

  res.status(201).json({ alert });
});

sosRouter.get("/event/:eventId", async (req, res) => {
  const eventId = Number(req.params.eventId);
  const rows = await db
    .select({
      id: sosAlerts.id,
      lat: sosAlerts.lat,
      lng: sosAlerts.lng,
      status: sosAlerts.status,
      note: sosAlerts.note,
      createdAt: sosAlerts.createdAt,
      isDrill: sosAlerts.isDrill,
      userName: users.name,
      badgeNo: users.badgeNo,
      phone: users.phone,
    })
    .from(sosAlerts)
    .innerJoin(users, eq(sosAlerts.userId, users.id))
    .where(eq(sosAlerts.eventId, eventId));

  res.json({ alerts: rows });
});

sosRouter.post("/:id/ack", async (req, res) => {
  const id = Number(req.params.id);
  const [alert] = await db.update(sosAlerts)
    .set({ status: "acknowledged", acknowledgedBy: req.user!.id, acknowledgedAt: new Date() })
    .where(eq(sosAlerts.id, id)).returning();
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  emitToEvent(alert.eventId, "sos:ack", { alert });
  res.json({ alert });
});

sosRouter.post("/:id/resolve", async (req, res) => {
  const id = Number(req.params.id);
  const [alert] = await db.update(sosAlerts)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(sosAlerts.id, id)).returning();
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  emitToEvent(alert.eventId, "sos:resolved", { alert });
  res.json({ alert });
});
