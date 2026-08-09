import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, pool } from "./db/client.js";
import { users, events, posts, postAssignments } from "./db/schema.js";

async function main() {
  console.log("Seeding demo data...");

  const adminHash = await bcrypt.hash("Admin@123", 10);
  const officerHash = await bcrypt.hash("Officer@123", 10);

  const [admin] = await db.insert(users).values({
    name: "ACP Traffic Control",
    badgeNo: "CMD-001",
    email: "admin@sbs.local",
    phone: "+919800000001",
    role: "commander",
    passwordHash: adminHash,
  }).returning();

  const [officer] = await db.insert(users).values({
    name: "PSI Rahul Deshmukh",
    badgeNo: "OFF-101",
    email: "officer@sbs.local",
    phone: "+919800000002",
    role: "officer",
    passwordHash: officerHash,
  }).returning();

  const [event] = await db.insert(events).values({
    title: "Ganesh Visarjan Bandobast — Demo",
    eventType: "festival",
    venueName: "Laxmi Road, Pune",
    venueLat: 18.5158,
    venueLng: 73.8567,
    startAt: new Date(Date.now() + 24 * 3600 * 1000),
    endAt: new Date(Date.now() + 48 * 3600 * 1000),
    expectedFootfall: 50000,
    status: "planned",
    createdBy: admin.id,
  }).returning();

  const [post] = await db.insert(posts).values({
    eventId: event.id,
    name: "Picket 1 — Laxmi Road Junction",
    type: "picket",
    lat: 18.5160,
    lng: 73.8570,
    geofenceRadiusM: 75,
    requiredStrength: 4,
  }).returning();

  await db.insert(postAssignments).values({
    postId: post.id,
    userId: officer.id,
    shiftStart: event.startAt,
    shiftEnd: event.endAt,
  });

  console.log("Seed complete.");
  console.log("Commander login: admin@sbs.local / Admin@123");
  console.log("Officer login:   officer@sbs.local / Officer@123");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
