const User = require("../models/User");

// Récupérer tous les utilisateurs (email et id seulement)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "_id email");
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Erreur lors de la récupération des utilisateurs.",
        error,
      });
  }
};
