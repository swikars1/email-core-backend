import EventEmitter from "events";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const myEmitter = new EventEmitter();

  myEmitter.setMaxListeners(15);
  const activeConnections = {};

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        if (data) {
          next();
        }
      } catch (e) {
        console.log("jwt token verification failed");
        next(new Error("jwt token verification failed"));
      }
    }
  });

  io.on("connection", (socket) => {
    let userUsername: string;

    socket.on("register", (username) => {
      userUsername = username;
      if (!activeConnections[username]) {
        activeConnections[username] = new Set();
      }
      activeConnections[username].add(socket);
    });

    socket.on("disconnect", () => {
      if (userUsername && activeConnections[userUsername]) {
        activeConnections[userUsername].delete(socket);
        if (activeConnections[userUsername].size === 0) {
          delete activeConnections[userUsername];
        }
      }
    });
  });

  myEmitter.on("newMailEvent", (data) => {
    const { username } = data;
    if (activeConnections[username]) {
      activeConnections[username].forEach((socket) => {
        try {
          socket.emit(`newmail-${username}`, data);
        } catch (error) {
          console.error(
            `Error emitting to socket for user ${username}:`,
            error
          );
        }
      });
    }
  });

  io.engine.on("connection_error", (err) => {
    console.log("Error", err.req, err.message, err.context);
  });

  return { myEmitter };
};
