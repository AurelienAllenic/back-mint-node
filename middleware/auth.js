const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant ou invalide." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = jwt.verify(
      token,
      process.env.RANDOM_SECRET_TOKEN || "secret_key"
    );
    req.userId = decodedToken.userId;
    
    // Récupérer le rôle de l'utilisateur
    const user = await User.findById(req.userId);
    if (user) {
      req.userRole = user.role;
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide." });
  }
};
