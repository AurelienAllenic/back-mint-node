const express = require("express");
const router = express.Router();
const raceController = require("../controllers/raceController");
const auth = require("../middleware/auth");

router.post("/", auth, raceController.createRace);
router.get("/", raceController.getRaces);
router.get("/:id", raceController.getRace);
router.put("/:id", auth, raceController.updateRace);
router.delete("/:id", auth, raceController.deleteRace);
router.post("/create-payment-intent", auth, raceController.createPaymentIntent);
router.post("/create-subscription", auth, raceController.createSubscription);
router.post(
  "/confirm-subscription",
  auth,
  raceController.confirmSubscriptionPayment
);

module.exports = router;
