import { Server } from "socket.io";
import { azureGet } from "./azureGraph";
import { httpServer } from ".";

// io.use(async (socket, next) => {
//   try {
//     const token = socket.handshake.auth.token;
//     console.log({ token });

//     const me = {};

//     socket["user"] = me;
//     next();
//   } catch (e) {
//     next(new Error("unknown user"));
//   }
// });
