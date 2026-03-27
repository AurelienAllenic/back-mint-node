const express = require("express");

const router = express.Router();
const sponsorController = require("../controllers/sponsorController");
const auth = require("../middleware/auth");

router.post("/", auth, sponsorController.createSponsor);
router.get("/", auth, sponsorController.getSponsors);

module.exports = router;
