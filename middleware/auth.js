const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
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
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide." });
  }
};
