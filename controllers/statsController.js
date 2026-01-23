const Race = require("../models/Race");
const User = require("../models/User");

// Récupérer les statistiques d'un coureur (seulement coureur + premium)
exports.getRunnerStats = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    // Vérifier que l'utilisateur est bien un coureur et premium
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (user.role !== "coureur") {
      return res.status(403).json({
        message: "Seuls les coureurs peuvent accéder aux statistiques.",
      });
    }

    if (!user.isPremium) {
      return res.status(403).json({
        message: "L'accès aux statistiques est réservé aux abonnés Premium.",
      });
    }

    // Récupérer toutes les courses où l'utilisateur est participant
    const races = await Race.find({ runners: userId })
      .populate("organization")
      .populate("owner");

    // Calculer les statistiques
    const totalRaces = races.length;
    const completedRaces = races.filter(
      (race) => race.endDate && new Date(race.endDate) < new Date()
    ).length;
    const upcomingRaces = races.filter(
      (race) => new Date(race.startDate) > new Date()
    ).length;
    const ongoingRaces = races.filter(
      (race) =>
        new Date(race.startDate) <= new Date() &&
        (!race.endDate || new Date(race.endDate) > new Date())
    ).length;

    res.status(200).json({
      totalRaces,
      completedRaces,
      upcomingRaces,
      ongoingRaces,
      races: races.map((race) => ({
        _id: race._id,
        name: race.name,
        startDate: race.startDate,
        endDate: race.endDate,
        organization: race.organization,
        owner: race.owner,
      })),
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des statistiques.",
      error: error.message,
    });
  }
};
