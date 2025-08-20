const express = require('express');
const authMiddleware = require("../middlewares/auth.middleware");
const chatControllers = require("../controller/chat.controller");

const router = express.Router();

router.route('/').post(authMiddleware.authUser, chatControllers.createChat);

module.exports = router;
