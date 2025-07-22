const express = require("express");

const router = express.Router();
const organizationController = require("../controllers/organizationController");
const auth = require("../middleware/auth");

router.post("/", auth, organizationController.createOrganization);
router.get("/", auth, organizationController.getOrganizations);

module.exports = router;
