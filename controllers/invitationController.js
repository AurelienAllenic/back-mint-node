const RaceInvitation = require("../models/RaceInvitation");
const Race = require("../models/Race");
const User = require("../models/User");

// Accepter une invitation (via token) - Requiert authentification
exports.acceptInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId; // Requis maintenant

    // Trouver l'invitation
    const invitation = await RaceInvitation.findOne({ token })
      .populate("race")
      .populate("invitedBy");

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation non trouvée ou invalide.",
      });
    }

    // Vérifier que l'invitation est valide
    if (!invitation.isValid()) {
      return res.status(400).json({
        message: "Cette invitation a expiré ou a déjà été traitée.",
      });
    }

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Vérifier que l'email correspond
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        message: "Cette invitation n'est pas destinée à votre compte.",
      });
    }

    // Vérifier que l'utilisateur est un coureur
    if (user.role !== "coureur") {
      return res.status(403).json({
        message: "Seuls les coureurs peuvent accepter des invitations.",
      });
    }

    // Vérifier que l'utilisateur n'est pas déjà dans la course
    const race = await Race.findById(invitation.race._id);
    const isAlreadyRunner = race.runners.some(
      (runnerId) => runnerId.toString() === userId
    );

    if (isAlreadyRunner) {
      // Marquer l'invitation comme acceptée même si déjà runner
      invitation.status = "accepted";
      invitation.user = userId;
      await invitation.save();

      return res.status(200).json({
        message: "Vous êtes déjà participant de cette course.",
        race: await Race.findById(invitation.race._id)
          .populate("organization")
          .populate("runners")
          .populate("owner"),
      });
    }

    // Ajouter l'utilisateur à la course
    await Race.findByIdAndUpdate(invitation.race._id, {
      $addToSet: { runners: userId },
    });

    // Marquer l'invitation comme acceptée
    invitation.status = "accepted";
    invitation.user = userId;
    await invitation.save();

    // Retourner la course mise à jour
    const updatedRace = await Race.findById(invitation.race._id)
      .populate("organization")
      .populate("runners")
      .populate("owner");

    res.status(200).json({
      message: "Invitation acceptée avec succès. Vous avez rejoint la course.",
      race: updatedRace,
    });
  } catch (error) {
    console.error("Erreur lors de l'acceptation de l'invitation:", error);
    res.status(500).json({
      message: "Erreur lors de l'acceptation de l'invitation.",
      error: error.message,
    });
  }
};

// Refuser une invitation
exports.rejectInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    // Trouver l'invitation
    const invitation = await RaceInvitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation non trouvée ou invalide.",
      });
    }

    // Vérifier que l'utilisateur correspond à l'invitation
    const user = await User.findById(userId);
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        message: "Cette invitation n'est pas destinée à votre compte.",
      });
    }

    // Marquer l'invitation comme refusée
    invitation.status = "rejected";
    invitation.user = userId;
    await invitation.save();

    res.status(200).json({
      message: "Invitation refusée avec succès.",
    });
  } catch (error) {
    console.error("Erreur lors du refus de l'invitation:", error);
    res.status(500).json({
      message: "Erreur lors du refus de l'invitation.",
      error: error.message,
    });
  }
};

// Récupérer les invitations en attente d'un utilisateur
exports.getMyInvitations = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Récupérer les invitations en attente pour l'email de l'utilisateur
    const invitations = await RaceInvitation.find({
      email: user.email.toLowerCase(),
      status: "pending",
    })
      .populate({
        path: "race",
        populate: [
          { path: "organization" },
          { path: "owner", select: "firstname lastname email" },
        ],
      })
      .populate("invitedBy", "firstname lastname email")
      .sort({ createdAt: -1 });

    // Filtrer les invitations valides (non expirées)
    const validInvitations = invitations.filter((inv) => inv.isValid());

    res.status(200).json({
      invitations: validInvitations.map((inv) => ({
        _id: inv._id,
        token: inv.token,
        race: inv.race,
        invitedBy: inv.invitedBy,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
      total: validInvitations.length,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des invitations:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des invitations.",
      error: error.message,
    });
  }
};

// Récupérer les détails d'une invitation par token (pour vérification avant login/register)
exports.getInvitationByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await RaceInvitation.findOne({ token })
      .populate({
        path: "race",
        populate: [
          { path: "organization" },
          { path: "owner", select: "firstname lastname email" },
        ],
      })
      .populate("invitedBy", "firstname lastname email");

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation non trouvée ou invalide.",
      });
    }

    if (!invitation.isValid()) {
      return res.status(400).json({
        message: "Cette invitation a expiré ou a déjà été traitée.",
        expired: true,
      });
    }

    res.status(200).json({
      invitation: {
        email: invitation.email,
        race: invitation.race,
        invitedBy: invitation.invitedBy,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'invitation:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération de l'invitation.",
      error: error.message,
    });
  }
};
