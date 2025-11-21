const User = require("../models/User");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Récupérer le profil de l'utilisateur authentifié
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId; // Depuis le middleware d'auth

    const user = await User.findById(
      userId,
      "_id email firstname lastname profileImage isPremium subscriptionId"
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

exports.cancelSubscription = async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Récupérer le customer Stripe via l'email ou metadata
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    if (!customers.data.length) {
      return res.status(404).json({ error: "Customer Stripe non trouvé" });
    }

    const customer = customers.data[0];

    // Récupérer les abonnements actifs du customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (!subscriptions.data.length) {
      // Pas d'abonnement actif → on remet juste isPremium à false
      user.isPremium = false;
      await user.save();
      return res.json({
        message: "Aucun abonnement actif trouvé, compte passé gratuit",
        isPremium: false,
      });
    }

    const subscription = subscriptions.data[0];

    // Annuler l'abonnement Stripe (à la fin de la période de facturation)
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    // OU annulation immédiate :
    // await stripe.subscriptions.del(subscription.id);

    // Mettre à jour l'utilisateur
    user.isPremium = false;
    await user.save();

    return res.json({
      message: "Abonnement annulé avec succès",
      isPremium: false,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("Erreur annulation abonnement:", error);
    return res.status(500).json({ error: error.message });
  }
};
