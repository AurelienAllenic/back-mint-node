const User = require("../models/User");

// Middleware pour vérifier que l'utilisateur est un organisateur
module.exports = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (user.role !== "organisateur") {
      return res.status(403).json({
        message: "Accès refusé. Cette action est réservée aux organisateurs.",
      });
    }

    next();
  } catch (error) {
    console.error("Erreur vérification rôle organisateur:", error);
    return res.status(500).json({
      message: "Erreur lors de la vérification du rôle.",
      error: error.message,
    });
  }
};
