// Route pour obtenir un token visiteur temporaire
router.post(
  "/visitor-token",
  require("../controllers/authController").visitorToken
);
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/verify-token", authController.verifyToken);

module.exports = router;
