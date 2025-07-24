const User = require("../models/User");

// Récupérer le profil de l'utilisateur authentifié
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId; // Depuis le middleware d'auth

    const user = await User.findById(
      userId,
      "_id email firstname lastname profileImage"
    );

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur non trouvé.",
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération du profil.",
      error: error.message,
    });
  }
};

// Mettre à jour le profil de l'utilisateur authentifié
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId; // Depuis le middleware d'auth
    const { firstname, lastname, profileImage } = req.body;

    // Vérifier qu'au moins un champ est fourni
    if (!firstname && !lastname && !profileImage) {
      return res.status(400).json({
        message: "Aucun champ à mettre à jour.",
      });
    }

    // Construire l'objet de mise à jour
    const update = {};
    if (firstname !== undefined) update.firstname = firstname;
    if (lastname !== undefined) update.lastname = lastname;
    if (profileImage !== undefined) update.profileImage = profileImage;

    // Mettre à jour l'utilisateur
    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      select: "_id email firstname lastname profileImage",
    });

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur non trouvé.",
      });
    }

    res.status(200).json({
      message: "Profil mis à jour avec succès",
      user: user,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour du profil.",
      error: error.message,
    });
  }
};

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

// Récupérer tous les utilisateurs (email et id seulement)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find(
      {},
      "_id email firstname lastname profileImage"
    );
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs.",
      error,
    });
  }
};
