const Race = require("../models/Race");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Créer un PaymentIntent pour le paiement
exports.createPaymentIntent = async (req, res) => {
  const { amount, currency, quantity } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertit en centimes (ex. 1.5 € -> 150)
      currency: currency || "eur",
      payment_method_types: ["card"],
      description: `Ajout de ${quantity} coureurs supplémentaires`, // Optionnel
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Erreur création PaymentIntent:", error);
    res.status(500).json({ error: "Erreur serveur Stripe" });
  }
};

exports.createSubscription = async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const User = require("../models/User");
  let user;
  try {
    user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
  } catch (err) {
    return res.status(500).json({ error: "Erreur base de données" });
  }

  const userEmail = user.email;
  const userId = user._id.toString();

  try {
    // 1. Récupère ou crée le Customer
    let customer = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (!customer.data.length) {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
    } else {
      customer = customer.data[0];
    }

    // 2. Crée un PaymentIntent avec montant = 0 (validation carte gratuite)
    const paymentIntent = await stripe.paymentIntents.create({
      customer: customer.id,
      amount: 0, // 0 centimes pour validation
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: { userId, type: "premium_subscription_setup" },
    });

    // 3. Crée la Subscription (débute après validation)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: "price_1SQrSYCRrXyKqFuXUkJ3Blq1" }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    res.json({
      clientSecret: paymentIntent.client_secret, // PaymentIntent secret (format pi_...)
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("Erreur abonnement:", error);
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

    // Validations basiques
    if (!name || !startDate || !endDate || !organization || !runners) {
      return res.status(400).json({ error: "Champs requis manquants" });
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
