const express = require("express");
const router = express.Router();
const redirectController = require("../controllers/redirectController");

// Route pour rediriger vers le deep link de l'app
// Utilisée dans les emails : http://10.0.2.2:3000/redirect-to-app?deepLink=mint://race-invitation?...
router.get("/redirect-to-app", redirectController.redirectToApp);

module.exports = router;
