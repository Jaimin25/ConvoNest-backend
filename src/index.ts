import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    allowedHeaders: ["Access-Control-Allow-Origin", "*"],
    origin: ["http://localhost:3000", "https://convonest.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const port = 4000;

const users: { userId: string; socketId: string }[] = [];

io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (token) {
    next();
  } else {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;

  if (userId !== undefined) {
    socket.join(userId);
    const index = users.findIndex((user) => user.userId === userId);
    if (index === -1) {
      users.push({ userId, socketId: socket.id });
    }
  }

  socket.on(`chat:${userId}:send-message`, (data) => {
    users.map((user: any) => {
      data.userId.map((id: any) => {
        if (user.userId === id) {
          socket.broadcast
            .to(user.userId)
            .emit(
              `chat:${user.userId}:receive-message`,
              data.message,
              data.chat
            );
        }
      });
    });
  });

  socket.on(`user:${userId}:send-request`, ({ data }) => {
    data.sentRequest.username = data.username;
    users.map((user: any) => {
      if (user.userId === data.sentRequest.receiverId) {
        socket.broadcast
          .to(user.userId)
          .emit(`user:${user.userId}:receive-request`, data.sentRequest);
      }
    });
  });

  socket.on(`user:${userId}:cancel-request`, (data) => {
    users.map((user: any) => {
      if (user.userId === data.receiverId || user.userId === data.senderId) {
        socket.broadcast
          .to(user.userId)
          .emit(`user:${user.userId}:cancel-request`, data.id);
      }
    });
  });

  socket.on(`user:${userId}:accept-request`, ({ data }) => {
    data.contact.username = data.username;
    users.map((user: any) => {
      if (user.userId === data.contact.user2Id) {
        socket.broadcast
          .to(user.userId)
          .emit(`user:${user.userId}:receive-accept-request`, data.contact);
      }
    });
  });

  socket.on(`user:${userId}:send-remove-friend`, (data) => {
    users.map((user: any) => {
      if (user.userId === data.receiverId) {
        socket.broadcast
          .to(user.userId)
          .emit(`user:${user.userId}:receive-remove-friend`, data);
      }
    });
  });

  socket.on(`chat:${userId}:send-delete-chat`, (data) => {
    users.map((user: any) => {
      data.users.map((receiver: any) => {
        if (user.userId === receiver.id) {
          socket.broadcast
            .to(receiver.id)
            .emit(`chat:${receiver.id}:receive-delete-chat`, data.chatId);
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
  console.log(`App listening on port ${port}`);
});
