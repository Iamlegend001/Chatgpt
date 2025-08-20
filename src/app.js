const cookieParser = require("cookie-parser");
const express = require("express");

/*/Routes*/
const chatRoutes = require("./routes/chat.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


/* Using Routes*/
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

module.exports = app;
