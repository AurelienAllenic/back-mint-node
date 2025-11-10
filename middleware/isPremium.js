import User from "../models/User.js";

const isPremium = async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user?.isPremium) {
    return res.status(403).json({ error: "Accès réservé aux abonnés Premium" });
  }
  next();
};

module.exports = isPremium;
