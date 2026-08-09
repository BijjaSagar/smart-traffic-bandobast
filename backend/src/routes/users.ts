import { Router } from "express";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Officer directory, for assigning personnel to posts (admin/commander only)
usersRouter.get("/", requireRole("admin", "commander"), async (_req, res) => {
  const rows = await db.select({
    id: users.id, name: users.name, badgeNo: users.badgeNo,
    role: users.role, phone: users.phone, email: users.email,
  }).from(users);
  res.json({ users: rows });
});
