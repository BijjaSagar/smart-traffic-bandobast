import {
  pgTable, serial, text, varchar, timestamp, doublePrecision, integer,
  pgEnum, boolean,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "commander", "officer"]);
export const agencyEnum = pgEnum("agency", [
  "traffic_police", "local_police", "fire", "medical", "municipal",
]);
export const eventStatusEnum = pgEnum("event_status", ["planned", "live", "completed"]);
export const postTypeEnum = pgEnum("post_type", [
  "picket", "barricade", "checkpoint", "medical", "parking",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present", "late", "absent",
]);
export const sosStatusEnum = pgEnum("sos_status", ["open", "acknowledged", "resolved"]);
export const convoyStatusEnum = pgEnum("convoy_status", ["scheduled", "active", "completed"]);
export const watchlistSeverityEnum = pgEnum("watchlist_severity", ["alert", "hold"]);
export const checkpointOutcomeEnum = pgEnum("checkpoint_outcome", ["clear", "flagged", "hold"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  badgeNo: varchar("badge_no", { length: 40 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 160 }).notNull().unique(),
  role: roleEnum("role").notNull().default("officer"),
  agency: agencyEnum("agency").notNull().default("traffic_police"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  eventType: varchar("event_type", { length: 60 }).notNull(),
  venueName: varchar("venue_name", { length: 160 }).notNull(),
  venueLat: doublePrecision("venue_lat").notNull(),
  venueLng: doublePrecision("venue_lng").notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  expectedFootfall: integer("expected_footfall"),
  status: eventStatusEnum("status").notNull().default("planned"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  type: postTypeEnum("type").notNull().default("picket"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  geofenceRadiusM: integer("geofence_radius_m").notNull().default(75),
  requiredStrength: integer("required_strength").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postAssignments = pgTable("post_assignments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  shiftStart: timestamp("shift_start").notNull(),
  shiftEnd: timestamp("shift_end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  postAssignmentId: integer("post_assignment_id").notNull()
    .references(() => postAssignments.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
  checkedInAt: timestamp("checked_in_at").notNull().defaultNow(),
  checkedInLat: doublePrecision("checked_in_lat").notNull(),
  checkedInLng: doublePrecision("checked_in_lng").notNull(),
  distanceMeters: doublePrecision("distance_meters").notNull(),
  status: attendanceStatusEnum("status").notNull().default("present"),
  checkedOutAt: timestamp("checked_out_at"),
});

export const sosAlerts = pgTable("sos_alerts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  status: sosStatusEnum("status").notNull().default("open"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  isDrill: boolean("is_drill").notNull().default(false),
});

// --- Module 7: Green Corridor / VIP Movement Automation ---

export const convoys = pgTable("convoys", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 120 }).notNull(),
  status: convoyStatusEnum("status").notNull().default("scheduled"),
  currentWaypointIndex: integer("current_waypoint_index").notNull().default(-1), // -1 = not started
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const convoyWaypoints = pgTable("convoy_waypoints", {
  id: serial("id").primaryKey(),
  convoyId: integer("convoy_id").notNull().references(() => convoys.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(), // order along the route, 0-based
  junctionName: varchar("junction_name", { length: 120 }).notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  preAlertMinutes: integer("pre_alert_minutes").notNull().default(5),
  reachedAt: timestamp("reached_at"),
});

// --- Module 8: Digital Nakabandi & QR Vehicle Verification ---

export const watchlistEntries = pgTable("watchlist_entries", {
  id: serial("id").primaryKey(),
  vehicleNumber: varchar("vehicle_number", { length: 20 }).notNull(),
  reason: text("reason").notNull(),
  severity: watchlistSeverityEnum("severity").notNull().default("alert"),
  addedBy: integer("added_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const checkpointLogs = pgTable("checkpoint_logs", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  vehicleNumber: varchar("vehicle_number", { length: 20 }).notNull(),
  matchedWatchlistEntryId: integer("matched_watchlist_entry_id").references(() => watchlistEntries.id),
  outcome: checkpointOutcomeEnum("outcome").notNull().default("clear"),
  checkedBy: integer("checked_by").notNull().references(() => users.id),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});
