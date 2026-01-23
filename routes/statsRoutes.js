const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController");
const auth = require("../middleware/auth");
const isCoureur = require("../middleware/isCoureur");
const isPremium = require("../middleware/isPremium");

// Récupérer les statistiques d'un coureur (coureur + premium requis)
router.get("/runner", auth, isCoureur, isPremium, statsController.getRunnerStats);

module.exports = router;
