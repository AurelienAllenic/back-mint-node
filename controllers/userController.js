// Modifier le prénom et/ou le nom d'un utilisateur
exports.updateUserNames = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstname, lastname } = req.body;
    if (!firstname && !lastname) {
      return res.status(400).json({ message: "Aucun champ à mettre à jour." });
    }
    const update = {};
    if (firstname !== undefined) update.firstname = firstname;
    if (lastname !== undefined) update.lastname = lastname;
    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      select: "_id email firstname lastname",
    });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour de l'utilisateur.",
      error,
    });
  }
};
const User = require("../models/User");

// Récupérer tous les utilisateurs (email et id seulement)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "_id email firstname lastname");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs.",
      error,
    });
  }
};
