const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Route pour obtenir un token visiteur temporaire
router.post("/visitor-token", authController.visitorToken);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/verify-token", authController.verifyToken);

module.exports = router;
