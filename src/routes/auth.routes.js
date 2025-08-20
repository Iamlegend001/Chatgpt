const express = require('express')
const authControllers = require("../controller/auth.conroller")

const router = express.Router()

router.route("/register").post(authControllers.registerUser)
router.route("/login").post(authControllers.loginUser)


module.exports = router