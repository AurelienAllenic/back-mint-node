const express = require("express");
const router = express.Router();
const raceController = require("../controllers/raceController");
const auth = require("../middleware/auth");
const isOrganisateur = require("../middleware/isOrganisateur");
const isCoureur = require("../middleware/isCoureur");

// Créer une course : seulement organisateur
router.post("/", auth, isOrganisateur, raceController.createRace);
router.get("/", raceController.getRaces);
// IMPORTANT : Cette route doit être AVANT /:id pour éviter les conflits
router.get("/my-races", auth, isCoureur, raceController.getMyRaces);
router.get("/:id", raceController.getRace);
// Modifier/Supprimer une course : seulement organisateur (et owner)
router.put("/:id", auth, isOrganisateur, raceController.updateRace);
router.delete("/:id", auth, isOrganisateur, raceController.deleteRace);
router.post("/create-payment-intent", auth, raceController.createPaymentIntent);
router.post("/create-subscription", auth, raceController.createSubscription);
router.post(
  "/confirm-subscription",
  auth,
  raceController.confirmSubscriptionPayment
);
router.post("/activate-premium", auth, raceController.activatePremium);
// Rejoindre une course : seulement coureur
router.post("/:id/join", auth, isCoureur, raceController.joinRace);
// Quitter une course : seulement coureur
router.post("/:id/leave", auth, isCoureur, raceController.leaveRace);

module.exports = router;
