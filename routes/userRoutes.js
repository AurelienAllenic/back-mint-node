const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

router.get("/", auth, userController.getUsers);

// Modifier prénom et/ou nom d'un utilisateur
router.patch("/:userId/names", auth, userController.updateUserNames);

module.exports = router;
