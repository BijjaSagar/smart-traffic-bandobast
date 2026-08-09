import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Officer directory, for assigning personnel to posts (admin/commander only).
// Module 10 (multi-agency dashboard): optional ?agency= filter so the command
// dashboard can show/hide traffic, local police, fire and medical personnel
// as separate layers instead of one undifferentiated list.
usersRouter.get("/", requireRole("admin", "commander"), async (req, res) => {
  const agency = req.query.agency as string | undefined;
  const rows = await db.select({
    id: users.id, name: users.name, badgeNo: users.badgeNo,
    role: users.role, agency: users.agency, phone: users.phone, email: users.email,
  }).from(users).where(agency ? eq(users.agency, agency as any) : undefined);
  res.json({ users: rows });
});

const createUserSchema = z.object({
  name: z.string().min(2),
  badgeNo: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["admin", "commander", "officer"]).default("officer"),
  agency: z.enum(["traffic_police", "local_police", "fire", "medical", "municipal"]),
  password: z.string().min(6),
});

// Onboard personnel from any agency (traffic, local police, fire, medical,
// municipal) onto the platform — this is what makes Module 10's "one shared
// operating picture" possible instead of everyone being traffic police.
usersRouter.post("/", requireRole("admin", "commander"), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const passwordHash = await bcrypt.hash(d.password, 10);
  const [user] = await db.insert(users).values({
    name: d.name, badgeNo: d.badgeNo, email: d.email, phone: d.phone,
    role: d.role, agency: d.agency, passwordHash,
  }).returning({
    id: users.id, name: users.name, badgeNo: users.badgeNo,
    role: users.role, agency: users.agency, email: users.email,
  });

  res.status(201).json({ user });
});
