const express = require("express");
const router = express.Router();
const visitorController = require("../controllers/visitorController");

router.post("/generate-code", visitorController.generateVisitorCode);
router.get("/code/:code", visitorController.getRaceFromCode);

module.exports = router;
