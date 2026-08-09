import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer, corsOrigins: string[]) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("join:event", (eventId: number) => {
      socket.join(`event:${eventId}`);
    });
    socket.on("leave:event", (eventId: number) => {
      socket.leave(`event:${eventId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
}

/** Broadcast to everyone watching a given event's live dashboard. */
export function emitToEvent(eventId: number, eventName: string, payload: unknown) {
  getIO().to(`event:${eventId}`).emit(eventName, payload);
}
