import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, pool } from "./db/client.js";
import { users, events, posts, postAssignments, watchlistEntries } from "./db/schema.js";

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
    agency: "traffic_police",
    passwordHash: adminHash,
  }).returning();

  const [officer] = await db.insert(users).values({
    name: "PSI Rahul Deshmukh",
    badgeNo: "OFF-101",
    email: "officer@sbs.local",
    phone: "+919800000002",
    role: "officer",
    agency: "traffic_police",
    passwordHash: officerHash,
  }).returning();

  // Module 10 — multi-agency personnel, so the command dashboard has more
  // than one agency's officers to actually show as separate layers.
  const [localPoliceOfficer] = await db.insert(users).values({
    name: "PSI Anjali More",
    badgeNo: "LP-201",
    email: "localpolice@sbs.local",
    phone: "+919800000003",
    role: "officer",
    agency: "local_police",
    passwordHash: officerHash,
  }).returning();

  const [fireOfficer] = await db.insert(users).values({
    name: "Fire Officer Sunil Kadam",
    badgeNo: "FIRE-301",
    email: "fire@sbs.local",
    phone: "+919800000004",
    role: "officer",
    agency: "fire",
    passwordHash: officerHash,
  }).returning();

  const [medicalOfficer] = await db.insert(users).values({
    name: "Dr. Priya Sane (EMS)",
    badgeNo: "MED-401",
    email: "medical@sbs.local",
    phone: "+919800000005",
    role: "officer",
    agency: "medical",
    passwordHash: officerHash,
  }).returning();

  // A COMPLETED past event at the same venue — this is what gives the
  // AI Deployment Planner (Module 1) real historical data to suggest from.
  const [pastEvent] = await db.insert(events).values({
    title: "Ganesh Visarjan Bandobast — Last Year",
    eventType: "festival",
    venueName: "Laxmi Road, Pune",
    venueLat: 18.5158,
    venueLng: 73.8567,
    startAt: new Date(Date.now() - 365 * 24 * 3600 * 1000),
    endAt: new Date(Date.now() - 364 * 24 * 3600 * 1000),
    expectedFootfall: 45000,
    status: "completed",
    createdBy: admin.id,
  }).returning();

  await db.insert(posts).values([
    {
      eventId: pastEvent.id,
      name: "Picket 1 — Laxmi Road Junction",
      type: "picket",
      lat: 18.5160, lng: 73.8570,
      geofenceRadiusM: 75, requiredStrength: 5,
    },
    {
      eventId: pastEvent.id,
      name: "Checkpoint — Tilak Road Entry",
      type: "checkpoint",
      lat: 18.5142, lng: 73.8552,
      geofenceRadiusM: 60, requiredStrength: 3,
    },
  ]);

  // Current upcoming event
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

  const [checkpointPost] = await db.insert(posts).values({
    eventId: event.id,
    name: "Checkpoint — Tilak Road Entry",
    type: "checkpoint",
    lat: 18.5142,
    lng: 73.8552,
    geofenceRadiusM: 60,
    requiredStrength: 3,
  }).returning();

  await db.insert(postAssignments).values([
    { postId: post.id, userId: officer.id, shiftStart: event.startAt, shiftEnd: event.endAt },
    { postId: checkpointPost.id, userId: localPoliceOfficer.id, shiftStart: event.startAt, shiftEnd: event.endAt },
  ]);

  // Module 8 — a sample watchlist entry so the checkpoint demo has
  // something real to match against.
  await db.insert(watchlistEntries).values({
    vehicleNumber: "MH12AB1234",
    reason: "Flagged for outstanding challan verification",
    severity: "alert",
    addedBy: admin.id,
  });

  console.log("Seed complete.");
  console.log("Commander login:    admin@sbs.local / Admin@123");
  console.log("Traffic officer:    officer@sbs.local / Officer@123");
  console.log("Local police:       localpolice@sbs.local / Officer@123");
  console.log("Fire:                fire@sbs.local / Officer@123");
  console.log("Medical:             medical@sbs.local / Officer@123");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
