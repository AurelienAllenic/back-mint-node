const RaceInvitation = require("../models/RaceInvitation");
const Race = require("../models/Race");
const User = require("../models/User");

// Accepter une invitation (via token) - Requiert authentification
exports.acceptInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const { raceId } = req.query; // Récupérer raceId depuis les paramètres de requête
    const userId = req.userId; // Requis maintenant

    // Construire la requête de recherche
    const query = { token };
    
    // Si raceId est fourni, l'ajouter à la requête pour vérifier que l'invitation correspond à la bonne course
    if (raceId) {
      query.race = raceId;
    }

    // Trouver l'invitation
    const invitation = await RaceInvitation.findOne(query)
      .populate("race")
      .populate("invitedBy");

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation non trouvée ou invalide.",
        details: raceId ? "Aucune invitation trouvée pour ce token et cette course." : "Aucune invitation trouvée pour ce token.",
      });
    }

    // Vérifier que l'invitation correspond bien à la course demandée si raceId est fourni
    if (raceId && invitation.race._id.toString() !== raceId) {
      return res.status(400).json({
        message: "Cette invitation ne correspond pas à la course spécifiée.",
        details: `L'invitation est pour la course ${invitation.race._id}, mais vous avez demandé la course ${raceId}.`,
      });
    }

    // Vérifier que l'invitation est valide
    if (!invitation.isValid()) {
      return res.status(400).json({
        message: "Cette invitation a expiré ou a déjà été traitée.",
        status: invitation.status,
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
    const { raceId } = req.query; // Récupérer raceId depuis les paramètres de requête

    console.log('token', token)
    console.log('raceId', raceId)

    // Construire la requête de recherche
    const query = { token };

    
    // Si raceId est fourni, l'ajouter à la requête pour vérifier que l'invitation correspond à la bonne course
    if (raceId) {
      query.race = raceId;
    }

    const invitation = await RaceInvitation.findOne(query)
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
        details: raceId ? "Aucune invitation trouvée pour ce token et cette course." : "Aucune invitation trouvée pour ce token.",
      });
    }

    // Vérifier que l'invitation correspond bien à la course demandée si raceId est fourni
    if (raceId && invitation.race._id.toString() !== raceId) {
      return res.status(400).json({
        message: "Cette invitation ne correspond pas à la course spécifiée.",
        details: `L'invitation est pour la course ${invitation.race._id}, mais vous avez demandé la course ${raceId}.`,
      });
    }

    // Vérifier si l'invitation est expirée
    const isExpired = invitation.expiresAt < new Date();
    
    // Gérer les différents statuts
    if (isExpired && invitation.status === "pending") {
      return res.status(400).json({
        message: "Cette invitation a expiré.",
        expired: true,
        status: invitation.status,
      });
    }

    if (invitation.status === "rejected") {
      return res.status(400).json({
        message: "Cette invitation a été refusée.",
        status: invitation.status,
      });
    }

    // Si l'invitation est "accepted", on retourne les détails mais on indique qu'elle est déjà acceptée
    // Cela permet à l'utilisateur de voir qu'il a déjà rejoint la course
    if (invitation.status === "accepted") {
      return res.status(200).json({
        invitation: {
          email: invitation.email,
          race: invitation.race,
          invitedBy: invitation.invitedBy,
          createdAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
        },
        alreadyAccepted: true,
        message: "Vous avez déjà accepté cette invitation et rejoint la course.",
      });
    }

    // Si l'invitation est "pending" et non expirée, elle est valide
    if (invitation.status === "pending" && !isExpired) {
      return res.status(200).json({
        invitation: {
          email: invitation.email,
          status: invitation.status,
          race: invitation.race,
          invitedBy: invitation.invitedBy,
          createdAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
        },
        alreadyAccepted: false,
      });
    }

    // Cas par défaut (ne devrait pas arriver)
    return res.status(400).json({
      message: "Cette invitation n'est pas valide.",
      status: invitation.status,
      expired: isExpired,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'invitation:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération de l'invitation.",
      error: error.message,
    });
  }
};

// Invitations en attente (pending + non expirées) pour une course — propriétaire uniquement
// GET /invitations/race/:raceId/summary
// Même logique que isValid() : status === "pending" && expiresAt > maintenant
exports.getRacePendingInvitationsSummaryForOwner = async (req, res) => {
  try {
    const { raceId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ message: "Course non trouvée." });
    }

    if (race.owner.toString() !== userId) {
      return res.status(403).json({ message: "Accès refusé." });
    }

    const now = new Date();

    // Uniquement invitations encore actionnables : pending + non expirées.
    // rejected / accepted / expired ne sont ni comptées ni listées.
    const invitations = await RaceInvitation.find({
      race: raceId,
      status: { $in: ["pending"] },
      expiresAt: { $gt: now },
    })
      .select("email status createdAt expiresAt")
      .sort({ createdAt: -1 });

    const pendingInvitations = invitations
      .filter(
        (inv) =>
          inv.status === "pending" &&
          typeof inv.isValid === "function" &&
          inv.isValid()
      )
      .map((inv) => ({
        email: inv.email,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      }));

    const pendingCount = pendingInvitations.length;
    const pendingEmails = new Set(
      pendingInvitations.map((p) => (p.email || "").toLowerCase())
    );

    await race.populate({ path: "runners", select: "email" });

    let acceptedParticipantsCount = 0;
    for (const runner of race.runners || []) {
      const email = (runner?.email || "").toLowerCase();
      if (!email) {
        acceptedParticipantsCount += 1;
        continue;
      }
      if (!pendingEmails.has(email)) {
        acceptedParticipantsCount += 1;
      }
    }

    const pendingN = Number(pendingCount);
    const acceptedN = Number(acceptedParticipantsCount);

    return res.status(200).json({
      pendingCount: pendingN,
      pendingInvitations,
      acceptedParticipantsCount: acceptedN,
      participantsCount: acceptedN,
      pending: pendingN,
      pending_count: pendingN,
      accepted_count: acceptedN,
      participants_accepted: acceptedN,
    });
  } catch (error) {
    console.error("Erreur getRacePendingInvitationsSummaryForOwner:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des invitations en attente.",
      error: error.message,
    });
  }
};
