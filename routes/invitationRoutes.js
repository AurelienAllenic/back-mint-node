const express = require("express");
const router = express.Router();
const invitationController = require("../controllers/invitationController");
const auth = require("../middleware/auth");

// Récupérer les invitations en attente d'un utilisateur
router.get("/my-invitations", auth, invitationController.getMyInvitations);

// Récupérer les détails d'une invitation par token (public, pour vérification avant login/register)
router.get("/token/:token", invitationController.getInvitationByToken);

// Accepter une invitation (requiert auth)
router.post("/token/:token/accept", auth, invitationController.acceptInvitation);

// Refuser une invitation (requiert auth)
router.post("/token/:token/reject", auth, invitationController.rejectInvitation);

// Résumé invitations d'une course (owner uniquement)
router.get(
  "/race/:raceId/invitations-summary",
  auth,
  invitationController.getRaceInvitationsSummary
);

module.exports = router;
