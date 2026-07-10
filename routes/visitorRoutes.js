const express = require("express");
const router = express.Router();
const visitorController = require("../controllers/visitorController");
const auth = require("../middleware/auth");
const isCoureur = require("../middleware/isCoureur");

router.post("/generate-code", auth, isCoureur, visitorController.generateVisitorCode);
router.get("/code/:code", visitorController.getRaceFromCode);

module.exports = router;
