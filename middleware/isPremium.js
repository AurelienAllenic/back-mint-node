const User = require("../models/User");

const isPremium = async (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: "Utilisateur non trouvé." });
  }
  
  if (!user.isPremium) {
    return res.status(403).json({ error: "Accès réservé aux abonnés Premium" });
  }
  next();
};

module.exports = isPremium;
