import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Room state storage
  const rooms = new Map<string, any>();

  const broadcastLobbyUpdate = () => {
    const availableRooms: any[] = [];
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.length === 1) {
        availableRooms.push({ roomId, players: room.players.length });
      }
    }
    io.emit("lobby-update", {
      onlineCount: io.engine.clientsCount,
      rooms: availableRooms
    });
  };

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    broadcastLobbyUpdate();

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          players: [socket.id],
          turn: socket.id,
          gameState: "waiting",
        });
      } else {
        const room = rooms.get(roomId);
        if (room.players.length < 2 && !room.players.includes(socket.id)) {
          room.players.push(socket.id);
          room.gameState = "playing";
          io.to(roomId).emit("game-start", {
            players: room.players,
            turn: room.turn,
          });
        }
      }
      broadcastLobbyUpdate();
    });

    socket.on("shot", (data) => {
      const { roomId, angle, power } = data;
      socket.to(roomId).emit("opponent-shot", { angle, power });
    });

    socket.on("sync-state", (data) => {
      const { roomId, balls, nextTurn } = data;
      const room = rooms.get(roomId);
      if (room) {
        room.turn = nextTurn;
        socket.to(roomId).emit("state-synced", { balls, nextTurn });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Clean up rooms
      for (const [roomId, room] of rooms.entries()) {
        if (room.players.includes(socket.id)) {
          room.players = room.players.filter((id: string) => id !== socket.id);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit("player-disconnected");
          }
        }
      }
      broadcastLobbyUpdate();
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
