const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../service/ai.service");
const messageModel = require("../models/message.model");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {});

  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

    if (!cookies.token) {
      return next(new Error("Authentication error: no token provided"));
    }
    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
      const user = await userModel.findById(decoded.id);
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("ai-message", async (messagePayload) => {
      console.log(messagePayload);
      
      await messageModel.create({
        user: socket.user._id,
        chat: messagePayload.chat,
        content: messagePayload.content,
        role: "user",
      });

      const response = await aiService.generateResponse(messagePayload.content);

      await messageModel.create({
        user: socket.user._id,
        chat: messagePayload.chat,
        content: response,
        role: "model",
      });


      socket.emit("ai-response", {
        content: response,
        chat: messagePayload.chat,
      });
    });
    // console.log("✅ User connected:", socket.user?.email);
  });
}

module.exports = { initSocketServer };
