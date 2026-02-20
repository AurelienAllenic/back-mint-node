// Générer un token visiteur temporaire (accès sans compte)
exports.visitorToken = (req, res) => {
  // Générer un JWT avec un rôle "visitor" et une durée courte (ex: 2h)
  const token = jwt.sign(
    { role: "visitor" },
    process.env.RANDOM_SECRET_TOKEN || "secret_key",
    { expiresIn: "7d" }
  );
  res.status(200).json({
    accessToken: token,
    role: "visitor",
  });
};
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const RaceInvitation = require("../models/RaceInvitation");
const Race = require("../models/Race");

const SECRET_KEY = process.env.JWT_SECRET || "secret_key";

// Inscription
exports.register = async (req, res) => {
  console.log("req.body:", req.body);
  const { email, password, firstname, lastname, name, role, invitationToken } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà." });
    }
    // On accepte name ("Prénom Nom") ou firstname/lastname séparés
    let finalFirstname = firstname;
    let finalLastname = lastname;
    if ((!firstname || !lastname) && name) {
      const parts = name.trim().split(" ");
      finalFirstname = parts[0] || "";
      finalLastname = parts.slice(1).join(" ") || "";
    }

    // Gestion du rôle
    // Rôles valides : "visitor", "coureur", "organisateur"
    let finalRole = "coureur"; // Rôle par défaut
    
    if (role) {
      // Valider que le rôle fourni est dans l'enum
      const validRoles = ["visitor", "coureur", "organisateur"];
      if (validRoles.includes(role)) {
        finalRole = role;
      } else {
        return res.status(400).json({
          message: `Rôle invalide. Rôles autorisés: ${validRoles.join(", ")}`,
        });
      }
    }

    // SÉCURITÉ : Empêcher l'inscription directe en tant qu'organisateur
    // (décommentez cette partie si vous voulez restreindre l'accès)
    // if (finalRole === "organisateur") {
    //   return res.status(403).json({
    //     message: "L'inscription en tant qu'organisateur nécessite une approbation.",
    //   });
    // }

    const newUser = new User({
      email,
      password,
      firstname: finalFirstname,
      lastname: finalLastname,
      role: finalRole,
    });
    await newUser.save();

    // Gérer l'invitation si un token est fourni
    let raceAdded = false;
    if (invitationToken) {
      try {
        const invitation = await RaceInvitation.findOne({
          token: invitationToken,
          email: email.toLowerCase(),
          status: "pending",
        });

        if (invitation && invitation.isValid()) {
          const race = await Race.findById(invitation.race);
          if (race) {
            // Vérifier que l'utilisateur n'est pas déjà dans la course
            const isAlreadyRunner = race.runners.some(
              (runnerId) => runnerId.toString() === newUser._id.toString()
            );

            if (!isAlreadyRunner && newUser.role === "coureur") {
              // Ajouter l'utilisateur à la course
              await Race.findByIdAndUpdate(invitation.race, {
                $addToSet: { runners: newUser._id },
              });

              // Marquer l'invitation comme acceptée
              invitation.status = "accepted";
              invitation.user = newUser._id;
              await invitation.save();

              raceAdded = true;
            }
          }
        }
      } catch (invitationError) {
        console.error("Erreur lors du traitement de l'invitation:", invitationError);
        // Ne pas bloquer l'inscription si l'invitation échoue
      }
    }

    res.status(201).json({
      message: raceAdded
        ? "Utilisateur créé avec succès et ajouté à la course."
        : "Utilisateur créé avec succès.",
      email: newUser.email,
      firstname: newUser.firstname,
      lastname: newUser.lastname,
      profileImage: newUser.profileImage,
      role: newUser.role,
      userId: newUser._id,
      raceAdded: raceAdded,
      accessToken: jwt.sign(
        { userId: newUser._id },
        process.env.RANDOM_SECRET_TOKEN || "secret_key",
        { expiresIn: "24h" }
      ),
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'inscription.", error });
  }
};

// Connexion
exports.login = async (req, res, next) => {
  try {
    const { email, password, invitationToken } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Utilisateur non trouvé !" });
    }

    const valid = await bcrypt.compare(password.trim(), user.password);
    if (!valid) {
      console.log("Paire username/password incorrecte");
      return res
        .status(401)
        .json({ error: "Paire username/password incorrecte !" });
    }

    // Gérer l'invitation si un token est fourni
    let raceAdded = false;
    if (invitationToken) {
      try {
        const invitation = await RaceInvitation.findOne({
          token: invitationToken,
          email: email.toLowerCase(),
          status: "pending",
        });

        if (invitation && invitation.isValid()) {
          const race = await Race.findById(invitation.race);
          if (race) {
            // Vérifier que l'utilisateur n'est pas déjà dans la course
            const isAlreadyRunner = race.runners.some(
              (runnerId) => runnerId.toString() === user._id.toString()
            );

            if (!isAlreadyRunner && user.role === "coureur") {
              // Ajouter l'utilisateur à la course
              await Race.findByIdAndUpdate(invitation.race, {
                $addToSet: { runners: user._id },
              });

              // Marquer l'invitation comme acceptée
              invitation.status = "accepted";
              invitation.user = user._id;
              await invitation.save();

              raceAdded = true;
            }
          }
        }
      } catch (invitationError) {
        console.error("Erreur lors du traitement de l'invitation:", invitationError);
        // Ne pas bloquer la connexion si l'invitation échoue
      }
    }

    // Utiliser les champs firstname et lastname du modèle
    const firstname = user.firstname || "";
    const lastname = user.lastname || "";

    res.status(200).json({
      technicalUser: { email: user.email },
      userProfile: {
        firstname,
        lastname,
        profileImage: user.profileImage,
        role: user.role,
      },
      firstname,
      lastname,
      profileImage: user.profileImage,
      role: user.role,
      _id: user._id,
      raceAdded: raceAdded,
      access_token: jwt.sign(
        { userId: user._id },
        process.env.RANDOM_SECRET_TOKEN || "secret_key",
        { expiresIn: "24h" }
      ),
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.verifyToken = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Token manquant ou invalide.", isValid: false });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.RANDOM_SECRET_TOKEN || "secret_key"
    );

    // Récupérer les informations complètes de l'utilisateur
    const user = await User.findById(
      decodedToken.userId,
      "_id email firstname lastname profileImage role"
    );

    if (!user) {
      return res.status(404).json({
        isValid: false,
        message: "Utilisateur non trouvé.",
      });
    }

    res.status(200).json({
      isValid: true,
      message: "Token valide.",
      userId: decodedToken.userId,
      user: {
        _id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        profileImage: user.profileImage,
        role: user.role,
      },
      accessToken: token,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification du token:", error);
    res.status(401).json({ isValid: false, message: "Token invalide." });
  }
};

// Vérifier si un email existe dans la base de données
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    }).select("email role");

    res.status(200).json({
      exists: !!user,
      role: user?.role || null,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de l'email:", error);
    res.status(500).json({ error: error.message });
  }
};
