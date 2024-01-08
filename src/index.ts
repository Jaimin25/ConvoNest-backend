import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const port = 4000;

const users: { userId: string; socketId: string }[] = [];

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (userId !== undefined) {
    socket.join(userId);
    if (!users.some((user) => user.userId === userId)) {
      users.push({ userId, socketId: socket.id });
    }
    console.log("[ONLINE]", users);
    console.log(`User ${userId} connected`);
  }

  socket.on(`chat:${userId}:send-message`, (data) => {
    users.map((user: any) => {
      data.userId.map((id: any) => {
        if (user.userId === id) {
          socket.broadcast
            .to(user.userId)
            .emit(`chat:${user.userId}:receive-message`, data.message);
        }
      });
    });
  });

  socket.on("disconnect", () => {
    socket.leave(userId);
    users.splice(
      users.findIndex((user) => user.userId === userId),
      1
    );
  });
});

app.get("/", (req: any, res: any) => {
  res.send("Hello World!");
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
