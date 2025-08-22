const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../service/ai.service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../service/vector.service");

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
      try {
        console.log(messagePayload);

        // Save user message (uncomment if you want persistence)
        // const userMsg = await messageModel.create({
        //   user: socket.user._id,
        //   chat: messagePayload.chat,
        //   content: messagePayload.content,
        //   role: "user",
        // });

        // Create embedding vector for memory
        const vectors = await aiService.generateVector(messagePayload.content);
        console.log("Vectors generated", vectors);

        // Fetch last 20 chat messages
        const chatHistory = (
          await messageModel
            .find({ chat: messagePayload.chat })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
        ).reverse();

        // 🔑 Add the current user message to the history
        chatHistory.push({
          role: "user",
          content: messagePayload.content,
        });

        // Format messages for Gemini
        const formattedHistory = chatHistory.map((item) => ({
          role: item.role === "model" ? "model" : "user",
          parts: [{ text: item.content }],
        }));

        // Generate AI response
        const response = await aiService.generateResponse(formattedHistory);

        // Save AI response (uncomment if you want persistence)
        // await messageModel.create({
        //   user: socket.user._id,
        //   chat: messagePayload.chat,
        //   content: response,
        //   role: "model",
        // });

        // Send back to client
        socket.emit("ai-response", {
          content: response,
          chat: messagePayload.chat,
        });
      } catch (error) {
        console.error("Error in ai-message handler:", error);
        socket.emit("ai-error", {
          message: "Failed to generate AI response",
          chat: messagePayload.chat,
        });
      }
    });

    console.log("✅ User connected:", socket.user?.email);
  });
}

module.exports = { initSocketServer };
