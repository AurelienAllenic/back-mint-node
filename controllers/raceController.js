const Race = require("../models/Race");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");

// Créer un PaymentIntent pour le paiement
exports.createPaymentIntent = async (req, res) => {
  const { amount, currency, quantity } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency || "eur",
      payment_method_types: ["card"],
      description: `Ajout de ${quantity} coureurs supplémentaires`,
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Erreur création PaymentIntent:", error);
    res.status(500).json({ error: "Erreur serveur Stripe" });
  }
};

exports.activatePremium = async (req, res) => {
  const { subscriptionId } = req.body;

  if (!req.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription introuvable" });
    }

    // OPTIONNEL : Activer le paiement automatique si tu veux
    await stripe.subscriptions.update(subscriptionId, {
      payment_settings: { save_default_payment_method: "on_subscription" },
      collection_method: "charge_automatically",
    });

    // Mise à jour de l'utilisateur
    await User.findByIdAndUpdate(req.userId, {
      isPremium: true,
      subscriptionId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Erreur activatePremium:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.createSubscription = async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Non authentifié" });

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

  try {
    let customer = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customer.data.length === 0) {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() },
      });
    } else {
      customer = customer.data[0];
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: "price_1SQrSYCRrXyKqFuXUkJ3Blq1" }],
      trial_period_days: 7, // 👈 TRIAL
      payment_behavior: "default_incomplete",
    });

    res.json({
      subscriptionId: subscription.id,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("Erreur createSubscription:", error);
    res.status(500).json({ error: error.message });
  }
};

// Confirm subscription payment
exports.confirmSubscriptionPayment = async (req, res) => {
  const { subscriptionId } = req.body;

  if (!req.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Vérifie que le paiement est bien réussi
    if (
      subscription.status === "active" ||
      subscription.status === "trialing"
    ) {
      await User.findByIdAndUpdate(req.userId, { isPremium: true });
      return res.json({ success: true, isPremium: true });
    } else {
      return res.status(400).json({ error: "Abonnement non actif" });
    }
  } catch (error) {
    console.error("Erreur confirmation abonnement:", error);
    res.status(500).json({ error: error.message });
  }
};

// Créer une course
exports.createRace = async (req, res) => {
  try {
    const {
      name,
      startDate,
      endDate,
      organization,
      runners,
      gpxFile,
      paymentIntentId,
    } = req.body;
    const owner = req.userId; // Assume middleware auth

    // Vérifier que l'utilisateur est bien un organisateur (déjà vérifié par middleware, mais double vérification)
    const user = await User.findById(req.userId);
    if (!user || user.role !== "organisateur") {
      return res.status(403).json({
        error: "Seuls les organisateurs peuvent créer des courses.",
      });
    }

    // Validations basiques
    if (!name || !startDate || !endDate || !organization || !runners) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    // Vérifier que tous les runners sont bien des coureurs (pas des organisateurs)
    if (runners && runners.length > 0) {
      const runnersUsers = await User.find({ _id: { $in: runners } });
      const nonCoureurs = runnersUsers.filter(
        (u) => u.role !== "coureur"
      );
      if (nonCoureurs.length > 0) {
        return res.status(400).json({
          error:
            "Seuls les coureurs peuvent participer à une course. Les organisateurs ne peuvent pas rejoindre de course.",
        });
      }
    }

    if (runners.length > 2) {
      if (!paymentIntentId) {
        return res
          .status(400)
          .json({ error: "Paiement requis pour plus de 2 coureurs" });
      }

      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.status !== "succeeded") {
          return res.status(400).json({ error: "Paiement non confirmé" });
        }

        const expectedAmount = Math.round((runners.length - 2) * 1.5 * 100); // En centimes
        if (pi.amount !== expectedAmount) {
          return res.status(400).json({ error: "Montant paiement incorrect" });
        }
      } catch (error) {
        console.error("Erreur vérification paiement:", error);
        return res.status(500).json({ error: "Erreur vérification paiement" });
      }
    }

    const race = new Race({
      name,
      startDate,
      endDate,
      organization,
      runners,
      gpxFile,
      owner,
    });
    await race.save();
    res.status(201).json(race);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la création de la course.", error });
  }
};

// Lire toutes les courses
exports.getRaces = async (req, res) => {
  try {
    const races = await Race.find()
      .populate("organization")
      .populate("runners")
      .populate("owner");
    res.status(200).json(races);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des courses.", error });
  }
};

// Lire une course par ID
exports.getRace = async (req, res) => {
  try {
    const race = await Race.findById(req.params.id)
      .populate("organization")
      .populate("runners")
      .populate("owner");
    if (!race) return res.status(404).json({ message: "Course non trouvée." });
    res.status(200).json(race);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération de la course.", error });
  }
};

// Modifier une course (seul l'owner)
exports.updateRace = async (req, res) => {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return res.status(404).json({ message: "Course non trouvée." });
    if (race.owner.toString() !== req.userId)
      return res.status(403).json({ message: "Accès refusé." });
    Object.assign(race, req.body);
    await race.save();
    res.status(200).json(race);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la modification de la course.", error });
  }
};

// Supprimer une course (seul l'owner)
exports.deleteRace = async (req, res) => {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return res.status(404).json({ message: "Course non trouvée." });
    if (race.owner.toString() !== req.userId)
      return res.status(403).json({ message: "Accès refusé." });
    await race.deleteOne();
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la suppression de la course.", error });
  }
};

// Rejoindre une course (seulement pour les coureurs)
exports.joinRace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    // Vérifier que l'utilisateur est bien un coureur (déjà vérifié par middleware, mais double vérification)
    const user = await User.findById(userId);
    if (!user || user.role !== "coureur") {
      return res.status(403).json({
        message: "Seuls les coureurs peuvent rejoindre une course.",
      });
    }

    // Trouver la course
    const race = await Race.findById(id);
    if (!race) {
      return res.status(404).json({ message: "Course non trouvée." });
    }

    // Vérifier que l'utilisateur n'est pas déjà participant
    const isParticipant = race.runners.some(
      (runnerId) => runnerId.toString() === userId
    );

    if (isParticipant) {
      return res.status(400).json({
        message: "Vous êtes déjà participant de cette course.",
      });
    }

    // Ajouter l'utilisateur à la liste des runners
    await Race.findByIdAndUpdate(
      id,
      { $addToSet: { runners: userId } },
      { new: true }
    );

    // Retourner la course mise à jour avec les données populées
    const updatedRace = await Race.findById(id)
      .populate("organization")
      .populate("runners")
      .populate("owner");

    res.status(200).json({
      message: "Vous avez rejoint la course avec succès.",
      race: updatedRace,
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription à la course:", error);
    res.status(500).json({
      message: "Erreur lors de l'inscription à la course.",
      error: error.message,
    });
  }
};

// Quitter une course (se retirer en tant que participant)
exports.leaveRace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    // Vérifier que l'utilisateur est bien un coureur (déjà vérifié par middleware, mais double vérification)
    const user = await User.findById(userId);
    if (!user || user.role !== "coureur") {
      return res.status(403).json({
        message: "Seuls les coureurs peuvent quitter une course.",
      });
    }

    // Trouver la course
    const race = await Race.findById(id);
    if (!race) {
      return res.status(404).json({ message: "Course non trouvée." });
    }

    // Vérifier que l'utilisateur est bien un participant
    const isParticipant = race.runners.some(
      (runnerId) => runnerId.toString() === userId
    );

    if (!isParticipant) {
      return res
        .status(400)
        .json({ message: "Vous n'êtes pas participant de cette course." });
    }

    // Utiliser $pull pour retirer l'utilisateur de la liste des runners (opération atomique)
    await Race.findByIdAndUpdate(
      id,
      { $pull: { runners: userId } },
      { new: true }
    );

    // Retourner la course mise à jour avec les données populées
    const updatedRace = await Race.findById(id)
      .populate("organization")
      .populate("runners")
      .populate("owner");

    res.status(200).json({
      message: "Vous avez quitté la course avec succès.",
      race: updatedRace,
    });
  } catch (error) {
    console.error("Erreur lors de la désinscription:", error);
    res.status(500).json({
      message: "Erreur lors de la désinscription de la course.",
      error: error.message,
    });
  }
};
