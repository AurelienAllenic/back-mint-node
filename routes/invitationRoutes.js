const express = require("express");
const router = express.Router();
const invitationController = require("../controllers/invitationController");
const auth = require("../middleware/auth");

// Récupérer les invitations en attente d'un utilisateur
router.get("/my-invitations", auth, invitationController.getMyInvitations);

// Résumé + liste des invitations pending valides pour une course (propriétaire uniquement)
router.get(
  "/race/:raceId/summary",
  auth,
  invitationController.getRacePendingInvitationsSummaryForOwner
);

// Récupérer les détails d'une invitation par token (public, pour vérification avant login/register)
router.get("/token/:token", invitationController.getInvitationByToken);

// Accepter une invitation (requiert auth)
router.post("/token/:token/accept", auth, invitationController.acceptInvitation);

// Refuser une invitation (requiert auth)
router.post("/token/:token/reject", auth, invitationController.rejectInvitation);

module.exports = router;
