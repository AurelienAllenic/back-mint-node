const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

router.get("/", auth, userController.getUsers);

// Récupérer le profil de l'utilisateur authentifié
router.get("/profile", auth, userController.getProfile);

// Mettre à jour le profil de l'utilisateur authentifié
router.patch("/profile", auth, userController.updateProfile);

// Modifier prénom et/ou nom d'un utilisateur (admin)
router.patch("/:userId/names", auth, userController.updateUserNames);

router.post("/cancel-subscription", auth, userController.cancelSubscription);

module.exports = router;
