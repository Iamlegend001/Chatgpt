const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../service/ai.service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../service/vector.service");
const { chat } = require("@pinecone-database/pinecone/dist/assistant/data/chat");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    // cors: {
    //   origin: "http://localhost:3000", // adjust if frontend runs elsewhere
    //   credentials: true,
    // },
  });

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

  // 🔌 Connection event
  io.on("connection", (socket) => {
    console.log("✅ User connected:", {
      socketId: socket.id,
      userId: socket.user?._id,
      userEmail: socket.user?.email
    });

    // Join user to a personal room
    socket.join(`user_${socket.user._id}`);

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
    });

    // Handle AI messages
    socket.on("ai-message", async (messagePayload) => {
      try {
        console.log("📩 Message received:", {
          chat: messagePayload.chat,
          contentLength: messagePayload.content?.length,
          userId: socket.user._id
        });

        // Validate message payload
        if (!messagePayload.content || !messagePayload.chat) {
          socket.emit("ai-error", {
            message: "Invalid message format",
            chat: messagePayload.chat,
          });
          return;
        }

        // Save user message (uncommented for actual use)
        await messageModel.create({
          user: socket.user._id,
          chat: messagePayload.chat,
          content: messagePayload.content,
          role: "user",
        });

        // Generate vector embeddings
        let vectors;
        try {
          vectors = await aiService.generateVector(messagePayload.content);
          // console.log("🧮 Vectors generated successfully",vectors);
          await createMemory({ vectors,messageId:"48532165462",metadata:{
            chat: messagePayload.chat,
            user: socket.user._id,
          }});
        } catch (vectorError) {
          console.error("❌ Vector generation failed:", vectorError);
          // Continue without vectors for now
        }

        // Save vector embedding (uncommented for actual use)
        // await createMemory({
        //   content: messagePayload.content,
        //   vectors: vectors,
        //   chat: messagePayload.chat,
        //   user: socket.user._id
        // });

        // Get chat history and sort by creation time
        const chatHistory = (
          await messageModel
            .find({ chat: messagePayload.chat })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
        ).reverse();

        console.log(`📚 Retrieved ${chatHistory.length} messages from history`);

        // Format messages for Google Generative AI API
        const formattedHistory = chatHistory.map((item) => ({
          role: item.role === "model" ? "model" : "user",
          parts: [{ text: item.content }],
        }));

        // Add current message to history
        formattedHistory.push({
          role: "user",
          parts: [{ text: messagePayload.content }]
        });

        // Generate AI response
        const response = await aiService.generateResponse(formattedHistory);
        console.log("🤖 AI response generated successfully");

        // Save AI response
        await messageModel.create({
          user: socket.user._id,
          chat: messagePayload.chat,
          content: response,
          role: "model",
        });

        // Send response to client
        socket.emit("ai-response", {
          content: response,
          chat: messagePayload.chat,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error("❌ Error in ai-message handler:", {
          message: error.message,
          stack: error.stack,
          userId: socket.user._id,
          chat: messagePayload?.chat
        });
        
        socket.emit("ai-error", {
          message: "Failed to generate AI response",
          chat: messagePayload.chat,
          error: error.message
        });
      }
    });

    // Handle typing indicators
    socket.on("typing", (data) => {
      socket.to(`chat_${data.chat}`).emit("user-typing", {
        userId: socket.user._id,
        userEmail: socket.user.email,
        chat: data.chat
      });
    });

    socket.on("stop-typing", (data) => {
      socket.to(`chat_${data.chat}`).emit("user-stopped-typing", {
        userId: socket.user._id,
        chat: data.chat
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log("❌ User disconnected:", {
        socketId: socket.id,
        userId: socket.user?._id,
        userEmail: socket.user?.email,
        reason: reason
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("❌ Socket error:", {
        socketId: socket.id,
        userId: socket.user?._id,
        error: error
      });
    });
  });

  // Handle server-level errors
  io.engine.on("connection_error", (err) => {
    console.error("❌ Connection error:", {
      req: err.req.url,
      code: err.code,
      message: err.message,
      context: err.context
    });
  });

  return io;
}

module.exports = { initSocketServer };