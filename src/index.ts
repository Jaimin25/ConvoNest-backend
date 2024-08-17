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

    users.push({ userId, socketId: socket.id });
  }
  const onlineUsers = users.map((user) => user.userId);

  socket.on("get-online-users", () => {
    socket.emit(
      "online-users",
      onlineUsers.filter((user, index) => onlineUsers.indexOf(user) === index),
    );
    users.map((user: any) => {
      socket.broadcast.to(user.userId).emit(
        "online-users",
        onlineUsers.filter(
          (user, index) => onlineUsers.indexOf(user) === index,
        ),
      );
    });
  });
  socket.on(`chat:${userId}:send-message`, (data) => {
    users.map((user: any) => {
      data.userId.map((id: any) => {
        if (user.userId === id) {
          socket.broadcast
            .to(user.socketId)
            .emit(
              `chat:${user.userId}:receive-message`,
              data.message,
              data.chat,
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
          .to(user.socketId)
          .emit(`user:${user.userId}:receive-request`, data.sentRequest);
      }
    });
  });

  socket.on(`user:${userId}:cancel-request`, (data) => {
    users.map((user: any) => {
      if (user.userId === data.receiverId || user.userId === data.senderId) {
        socket.broadcast
          .to(user.socketId)
          .emit(`user:${user.userId}:cancel-request`, data.id);
      }
    });
  });

  socket.on(`user:${userId}:accept-request`, ({ data }) => {
    data.contact.username = data.username;
    users.map((user: any) => {
      if (user.userId === data.contact.user2Id) {
        socket.broadcast
          .to(user.socketId)
          .emit(`user:${user.userId}:receive-accept-request`, data.contact);
      }
    });
  });

  socket.on(`user:${userId}:send-remove-friend`, (data) => {
    users.map((user: any) => {
      if (user.userId === data.receiverId) {
        socket.broadcast
          .to(user.socketId)
          .emit(`user:${user.userId}:receive-remove-friend`, data);
      }
    });
  });

  socket.on(`chat:${userId}:send-delete-chat`, (data) => {
    users.map((user: any) => {
      data.users.map((receiver: any) => {
        if (user.userId === receiver.id) {
          socket.broadcast
            .to(user.socketId)
            .emit(`chat:${receiver.id}:receive-delete-chat`, data.chatId);
        }
      });
    });
  });

  socket.on(`chat:${userId}:send-delete-message`, (data) => {
    users.map((user: any) => {
      data.users.map((receiver: any) => {
        if (user.userId === receiver.id) {
          socket.broadcast
            .to(user.socketId)
            .emit(
              `chat:${receiver.id}:receive-delete-message`,
              data.chatId,
              data.messageId,
            );
        }
      });
    });
  });

  socket.on(`chat:${userId}:send-typing`, (usersList, chatId, typingUserId) => {
    users.map((user: any) => {
      usersList.map((receiver: any) => {
        if (user.userId === receiver) {
          socket.broadcast
            .to(user.socketId)
            .emit(
              `chat:${user.userId}:receive-typing`,
              user.userId,
              true,
              chatId,
              typingUserId && typingUserId,
            );
        }
      });
    });
  });

  socket.on(`chat:${userId}:send-stop-typing`, (usersList, chatId) => {
    users.map((user: any) => {
      usersList.map((receiver: any) => {
        if (user.userId === receiver) {
          socket.broadcast
            .to(user.socketId)
            .emit(
              `chat:${user.userId}:receive-stop-typing`,
              user.userId,
              false,
              chatId,
            );
        }
      });
    });
  });

  socket.on("disconnect", () => {
    socket.leave(socket.id);
    users.splice(
      users.findIndex((user) => user.socketId === socket.id),
      1,
    );
    const onlineUsers = users.map((user) => user.userId);
    users.map((user: any) => {
      socket.broadcast.to(user.userId).emit(
        "online-users",
        onlineUsers.filter(
          (user, index) => onlineUsers.indexOf(user) === index,
        ),
      );
    });
  });
});

app.get("/", (req: any, res: any) => {
  res.send("Hello World!");
});

server.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
