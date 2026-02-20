const Race = require("../models/Race");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");
const RaceInvitation = require("../models/RaceInvitation");
const emailService = require("../services/emailService");
const Organization = require("../models/Organization");

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
  console.log("\n\n🔥🔥🔥 CREATE RACE APPELÉE 🔥🔥🔥\n");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers authorization:", req.headers.authorization ? "présent" : "absent");
  
  try {
    console.log("req.body AVANT destructuration:", req.body);
    console.log("Type de req.body:", typeof req.body);
    
    const {
      name,
      startDate,
      endDate,
      organization,
      runnerEmails, // ⬅️ Changé de "runners" à "runnerEmails"
      gpxFile,
      paymentIntentId,
    } = req.body;
    const owner = req.userId;

    // Debug: logger les valeurs reçues COMPLÈTES
    console.log("=== CREATE RACE - DÉBUT ===");
    console.log("req.body complet:", JSON.stringify(req.body, null, 2));
    console.log("req.userId:", req.userId);
    console.log("--- Détails des champs ---");
    console.log("name:", name, "| type:", typeof name, "| trimmed:", name?.trim());
    console.log("startDate:", startDate, "| type:", typeof startDate);
    console.log("endDate:", endDate, "| type:", typeof endDate);
    console.log("organization:", organization, "| type:", typeof organization);
    console.log("runnerEmails:", runnerEmails, "| type:", typeof runnerEmails, "| length:", Array.isArray(runnerEmails) ? runnerEmails.length : "N/A");
    console.log("gpxFile:", gpxFile ? `présent (${gpxFile.length} chars)` : "absent");
    console.log("paymentIntentId:", paymentIntentId || "absent");
    console.log("========================");

    // Vérifier que l'utilisateur est bien un organisateur
    const user = await User.findById(req.userId);
    console.log("User trouvé:", user ? `${user.email} (role: ${user.role})` : "NON TROUVÉ");
    if (!user || user.role !== "organisateur") {
      console.log("❌ ERREUR: Utilisateur non organisateur");
      return res.status(403).json({
        error: "Seuls les organisateurs peuvent créer des courses.",
      });
    }

    // Validations basiques - runnerEmails est maintenant optionnel (peut être vide)
    console.log("--- Validation des champs ---");
    if (!name || !name.trim()) {
      console.log("❌ ERREUR: name manquant ou vide");
      return res.status(400).json({ error: "Le nom de la course est requis" });
    }
    console.log("✅ name OK");
    
    if (!startDate) {
      console.log("❌ ERREUR: startDate manquant");
      return res.status(400).json({ error: "La date de début est requise" });
    }
    console.log("✅ startDate OK");
    
    if (!endDate) {
      console.log("❌ ERREUR: endDate manquant");
      return res.status(400).json({ error: "La date de fin est requise" });
    }
    console.log("✅ endDate OK");
    
    if (!organization || (typeof organization === 'string' && !organization.trim())) {
      console.log("❌ ERREUR: organization manquant ou vide");
      console.log("   organization value:", organization);
      console.log("   organization type:", typeof organization);
      return res.status(400).json({ error: "L'organisation est requise" });
    }
    console.log("✅ organization OK:", organization);

    // Vérifier que l'organization existe dans la base de données
    console.log("--- Vérification organisation en DB ---");
    console.log("Recherche organization avec ID:", organization);
    const orgExists = await Organization.findById(organization);
    if (!orgExists) {
      console.log("❌ ERREUR: Organization non trouvée en DB");
      console.log("   ID recherché:", organization);
      // Vérifier aussi si c'est peut-être un ID numérique (format frontend)
      const orgsByCreatedBy = await Organization.find({ created_by_id: req.userId });
      console.log("   Organisations disponibles pour cet utilisateur:", orgsByCreatedBy.map(o => ({ id: o._id.toString(), name: o.name })));
      return res.status(400).json({ error: "L'organisation spécifiée n'existe pas" });
    }
    console.log("✅ Organization trouvée:", orgExists.name, "(ID:", orgExists._id.toString() + ")");

    // Normaliser les emails si fournis
    let normalizedEmails = [];
    if (runnerEmails && Array.isArray(runnerEmails) && runnerEmails.length > 0) {
      normalizedEmails = runnerEmails.map((email) => email.toLowerCase().trim());
      
      // Valider le format des emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = normalizedEmails.filter((email) => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        return res.status(400).json({
          error: `Emails invalides: ${invalidEmails.join(", ")}`,
        });
      }
    }

    // Vérifier le paiement si nécessaire (plus de 2 emails)
    if (normalizedEmails.length > 2) {
      if (!paymentIntentId) {
        return res.status(400).json({
          error: "Paiement requis pour plus de 2 coureurs",
          requiredPayment: (normalizedEmails.length - 2) * 1.5,
        });
      }

      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.status !== "succeeded") {
          return res.status(400).json({ error: "Paiement non confirmé" });
        }

        const expectedAmount = Math.round((normalizedEmails.length - 2) * 1.5 * 100);
        if (pi.amount !== expectedAmount) {
          return res.status(400).json({ error: "Montant paiement incorrect" });
        }
      } catch (error) {
        console.error("Erreur vérification paiement:", error);
        return res.status(500).json({ error: "Erreur vérification paiement" });
      }
    }

    // Créer et sauvegarder la course d'abord (pour avoir un _id)
    const race = new Race({
      name,
      startDate,
      endDate,
      organization,
      runners: [], // Tableau vide initialement
      gpxFile,
      owner,
    });
    await race.save();

    // Créer les invitations pour chaque email
    const invitations = [];
    const addedRunners = []; // IDs des utilisateurs ajoutés directement
    let emailsSentSuccessfully = 0; // Compteur d'emails envoyés avec succès
    const emailErrors = []; // Liste des erreurs d'email
    const createdInvitationIds = []; // IDs des invitations créées (pour les supprimer si échec)

    if (normalizedEmails.length > 0) {
      for (const email of normalizedEmails) {
        try {
          // Vérifier si un utilisateur existe déjà avec cet email
          const existingUser = await User.findOne({ email: email.toLowerCase() });

          // Créer une invitation pour chaque email (même si l'utilisateur existe déjà)
          const invitation = new RaceInvitation({
            race: race._id,
            email: email,
            invitedBy: req.userId,
            status: existingUser && existingUser.role === "coureur" ? "accepted" : "pending",
          });
          await invitation.save();
          invitations.push(invitation);
          createdInvitationIds.push(invitation._id);

          // Si l'utilisateur existe déjà et est coureur, l'ajouter directement à la course
          if (existingUser && existingUser.role === "coureur") {
            if (!race.runners.includes(existingUser._id)) {
              race.runners.push(existingUser._id);
              addedRunners.push(existingUser._id);
            }
            // Marquer l'invitation comme acceptée car déjà ajouté
            invitation.status = "accepted";
            await invitation.save();
            console.log(`✅ Utilisateur ${email} ajouté directement à la course`);
          }

          // Toujours envoyer un email d'invitation (même si l'utilisateur existe déjà)
          try {
            await emailService.sendRaceInvitation(
              email,
              race.name,
              invitation.token,
              race._id.toString()
            );
            emailsSentSuccessfully++; // Email envoyé avec succès
            console.log(`✅ Email envoyé avec succès à ${email}`);
          } catch (emailError) {
            console.error(`❌ Erreur envoi email à ${email}:`, emailError.message || emailError);
            emailErrors.push({ email, error: emailError.message || emailError.toString() });
            
            // Supprimer l'invitation créée car l'email a échoué
            await RaceInvitation.findByIdAndDelete(invitation._id);
            const index = invitations.findIndex(inv => inv._id.toString() === invitation._id.toString());
            if (index > -1) invitations.splice(index, 1);
            
            // Si l'utilisateur avait été ajouté directement, le retirer aussi
            if (existingUser && existingUser.role === "coureur") {
              race.runners = race.runners.filter(runnerId => runnerId.toString() !== existingUser._id.toString());
              addedRunners = addedRunners.filter(runnerId => runnerId.toString() !== existingUser._id.toString());
            }
            
            if (emailError.message && emailError.message.includes("Greeting never received")) {
              console.error("💡 Astuce: Vérifiez votre configuration SMTP:");
              console.error("   - Pour Gmail: utilisez un 'mot de passe d'application' (pas votre mot de passe normal)");
              console.error("   - Activez l'authentification à deux facteurs sur votre compte Gmail");
              console.error("   - Générez un mot de passe d'application: https://myaccount.google.com/apppasswords");
            }
          }
        } catch (error) {
          console.error(`Erreur traitement email ${email}:`, error);
          emailErrors.push({ email, error: error.message || error.toString() });
        }
      }

      // Vérifier si au moins un email/utilisateur a été traité avec succès
      if (emailsSentSuccessfully === 0) {
        // Aucun email envoyé avec succès et aucun utilisateur ajouté
        // Supprimer la course et toutes les invitations créées
        console.error("❌ Aucun email n'a pu être envoyé. Suppression de la course créée.");
        
        // Supprimer toutes les invitations restantes
        for (const invId of createdInvitationIds) {
          await RaceInvitation.findByIdAndDelete(invId);
        }
        
        // Supprimer la course
        await Race.findByIdAndDelete(race._id);
        
        // Créer un message d'erreur détaillé
        const errorDetails = emailErrors.length > 0 
          ? emailErrors.map(e => `${e.email}: ${e.error}`).join("; ")
          : "Aucun détail disponible";
        
        return res.status(400).json({
          error: "Impossible d'envoyer les invitations par email. La course n'a pas été créée.",
          message: "Tous les emails ont échoué. Vérifiez votre configuration SMTP dans le fichier .env.",
          details: errorDetails,
          failedEmails: emailErrors,
          help: {
            smtpHost: process.env.SMTP_HOST || "non configuré",
            smtpPort: process.env.SMTP_PORT || "non configuré",
            smtpUser: process.env.SMTP_USER || "non configuré",
            tips: [
              "Pour Gmail: utilisez un 'mot de passe d'application' (pas votre mot de passe normal)",
              "Activez l'authentification à deux facteurs sur votre compte Gmail",
              "Générez un mot de passe d'application: https://myaccount.google.com/apppasswords",
              "Vérifiez que SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASSWORD sont correctement configurés dans votre .env"
            ]
          }
        });
      }

      // Au moins un succès, sauvegarder les modifications de la course (runners ajoutés)
      await race.save();
      console.log(`✅ Course créée avec ${emailsSentSuccessfully} invitation(s) traitée(s) avec succès`);
    }

    // Retourner la course avec les données populées
    const populatedRace = await Race.findById(race._id)
      .populate("organization")
      .populate("runners")
      .populate("owner");

    console.log("=== CREATE RACE - SUCCÈS ===");
    console.log("Race créée avec ID:", race._id);
    console.log("Invitations créées:", invitations.length);
    console.log("Runners ajoutés directement:", addedRunners.length);
    console.log("===========================");

    res.status(201).json({
      ...populatedRace.toObject(),
      invitationsCreated: invitations.length,
      runnersAdded: addedRunners.length,
    });
  } catch (error) {
    console.error("=== CREATE RACE - ERREUR ===");
    console.error("Erreur complète:", error);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("===========================");
    res.status(500).json({
      message: "Erreur lors de la création de la course.",
      error: error.message,
    });
  }
};

// Lire toutes les courses
exports.getRaces = async (req, res) => {
  try {
    const races = await Race.find()
      .populate("organization")
      .populate("runners")
      .populate("owner")
      .select("-gpxFile"); // Exclure gpxFile pour optimiser les performances (fichier volumineux)
    res.status(200).json(races);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des courses.", error });
  }
};

// Récupérer les courses d'un coureur (mes courses inscrites)
exports.getMyRaces = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    // Vérifier que l'utilisateur est bien un coureur (déjà vérifié par middleware, mais double vérification)
    const user = await User.findById(userId);
    if (!user || user.role !== "coureur") {
      return res.status(403).json({
        message: "Seuls les coureurs peuvent accéder à leurs courses.",
      });
    }

    // Récupérer toutes les courses où l'utilisateur est dans le tableau runners
    const races = await Race.find({ runners: userId })
      .populate("organization")
      .populate("runners")
      .populate("owner")
      .select("-gpxFile") // Exclure gpxFile pour optimiser les performances (fichier volumineux)
      .sort({ startDate: -1 }); // Trier par date de début (plus récentes en premier)

    // Formater les données pour correspondre au format attendu par le frontend
    const formattedRaces = races.map((race) => {
      const now = new Date();
      const startDate = new Date(race.startDate);
      const endDate = race.endDate ? new Date(race.endDate) : null;

      let status = "upcoming";
      if (endDate && now > endDate) {
        status = "completed";
      } else if (now >= startDate && (!endDate || now <= endDate)) {
        status = "ongoing";
      }

      return {
        _id: race._id,
        name: race.name,
        date: race.startDate,
        location: race.organization?.name || "Non spécifié",
        distance: race.distance || null,
        status: status,
        startDate: race.startDate,
        endDate: race.endDate,
        organization: race.organization,
      };
    });

    res.status(200).json({
      races: formattedRaces,
      total: formattedRaces.length,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des courses du coureur:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération de vos courses.",
      error: error.message,
    });
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

// Ajouter des coureurs à une course existante (envoi d'invitations par email)
exports.addRunners = async (req, res) => {
  try {
    const { id } = req.params;
    const { emails, paymentIntentId } = req.body; // emails est un tableau d'emails
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    // Vérifier que l'utilisateur est bien un organisateur
    const user = await User.findById(userId);
    if (!user || user.role !== "organisateur") {
      return res.status(403).json({
        error: "Seuls les organisateurs peuvent ajouter des coureurs à une course.",
      });
    }

    // Trouver la course
    const race = await Race.findById(id).populate("runners");
    if (!race) {
      return res.status(404).json({ message: "Course non trouvée." });
    }

    // Vérifier que l'utilisateur est le propriétaire de la course
    if (race.owner.toString() !== userId) {
      return res.status(403).json({
        message: "Seul le propriétaire de la course peut ajouter des coureurs.",
      });
    }

    // Validation
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: "Veuillez fournir au moins une adresse email.",
      });
    }

    // Normaliser les emails (minuscules, trim)
    const normalizedEmails = emails.map((email) => email.toLowerCase().trim());

    // Vérifier que les emails sont valides
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = normalizedEmails.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        error: `Emails invalides: ${invalidEmails.join(", ")}`,
      });
    }

    // Récupérer les emails des runners déjà dans la course
    const existingRunnersEmails = race.runners
      .map((runner) => runner.email?.toLowerCase())
      .filter(Boolean);

    // Filtrer les emails qui ne sont pas déjà dans la course
    const newEmails = normalizedEmails.filter(
      (email) => !existingRunnersEmails.includes(email)
    );

    if (newEmails.length === 0) {
      return res.status(400).json({
        error: "Tous les emails fournis sont déjà participants de cette course.",
      });
    }

    // Calculer le nombre total de coureurs après ajout
    const currentRunnerCount = race.runners.length;
    const totalRunnerCount = currentRunnerCount + newEmails.length;

    // Vérifier le paiement si nécessaire (plus de 2 coureurs au total)
    if (totalRunnerCount > 2) {
      // Calculer combien de nouveaux coureurs nécessitent un paiement
      const freeSlots = Math.max(0, 2 - currentRunnerCount);
      const paidRunners = newEmails.length - freeSlots;

      if (paidRunners > 0) {
        if (!paymentIntentId) {
          return res.status(400).json({
            error: `Paiement requis pour ${paidRunners} coureur(s) supplémentaire(s).`,
            requiredPayment: paidRunners * 1.5, // Montant en euros
            paidRunners: paidRunners,
          });
        }

        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (pi.status !== "succeeded") {
            return res.status(400).json({
              error: "Paiement non confirmé",
            });
          }

          const expectedAmount = Math.round(paidRunners * 1.5 * 100); // En centimes
          if (pi.amount !== expectedAmount) {
            return res.status(400).json({
              error: `Montant paiement incorrect. Attendu: ${expectedAmount / 100}€, Reçu: ${pi.amount / 100}€`,
            });
          }
        } catch (error) {
          console.error("Erreur vérification paiement:", error);
          return res.status(500).json({
            error: "Erreur lors de la vérification du paiement",
          });
        }
      }
    }

    // Créer les invitations pour chaque email
    const invitations = [];
    const emailResults = [];

    for (const email of newEmails) {
      try {
        // Vérifier si une invitation en attente existe déjà pour cet email et cette course
        const existingInvitation = await RaceInvitation.findOne({
          email: email,
          race: id,
          status: "pending",
        });

        if (existingInvitation) {
          emailResults.push({
            email,
            status: "skipped",
            message: "Une invitation en attente existe déjà pour cet email.",
          });
          continue;
        }

        // Créer une nouvelle invitation
        const invitation = new RaceInvitation({
          race: id,
          email: email,
          invitedBy: userId,
        });

        await invitation.save();
        invitations.push(invitation);

        // Envoyer l'email d'invitation
        try {
          await emailService.sendRaceInvitation(
            email,
            race.name,
            invitation.token,
            id
          );
          emailResults.push({
            email,
            status: "sent",
            message: "Invitation envoyée avec succès.",
          });
        } catch (emailError) {
          console.error(`Erreur envoi email à ${email}:`, emailError);
          emailResults.push({
            email,
            status: "invitation_created",
            message: "Invitation créée mais email non envoyé.",
            error: emailError.message,
          });
        }
      } catch (error) {
        console.error(`Erreur création invitation pour ${email}:`, error);
        emailResults.push({
          email,
          status: "error",
          message: "Erreur lors de la création de l'invitation.",
          error: error.message,
        });
      }
    }

    // Retourner le résultat
    res.status(200).json({
      message: `${invitations.length} invitation(s) créée(s) avec succès.`,
      invitations: emailResults,
      totalInvitations: invitations.length,
      race: await Race.findById(id)
        .populate("organization")
        .populate("runners")
        .populate("owner"),
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de coureurs:", error);
    res.status(500).json({
      message: "Erreur lors de l'ajout de coureurs à la course.",
      error: error.message,
    });
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
