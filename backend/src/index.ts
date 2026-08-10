import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { authRouter } from "./routes/auth.js";
import { eventsRouter } from "./routes/events.js";
import { postsRouter } from "./routes/posts.js";
import { attendanceRouter } from "./routes/attendance.js";
import { sosRouter } from "./routes/sos.js";
import { usersRouter } from "./routes/users.js";
import { plannerRouter } from "./routes/planner.js";
import { riskRouter } from "./routes/risk.js";
import { reportsRouter } from "./routes/reports.js";
import { convoysRouter } from "./routes/convoys.js";
import { checkpointsRouter } from "./routes/checkpoints.js";
import { settingsRouter } from "./routes/settings.js";
import { initSocket } from "./lib/socket.js";

const app = express();
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "smart-bandobast-backend" }));

app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/posts", postsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/sos", sosRouter);
app.use("/api/users", usersRouter);
app.use("/api/planner", plannerRouter);
app.use("/api/risk", riskRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/convoys", convoysRouter);
app.use("/api/checkpoints", checkpointsRouter);
app.use("/api/settings", settingsRouter);

const server = http.createServer(app);
initSocket(server, corsOrigins);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`Smart Bandobast backend listening on :${port}`);
});
