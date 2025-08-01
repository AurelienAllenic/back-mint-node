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

const SECRET_KEY = process.env.JWT_SECRET || "secret_key";

// Inscription
exports.register = async (req, res) => {
  console.log("req.body:", req.body);
  const { email, password, firstname, lastname, name } = req.body;

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
    const newUser = new User({
      email,
      password,
      firstname: finalFirstname,
      lastname: finalLastname,
    });
    await newUser.save();

    res.status(201).json({
      message: "Utilisateur créé avec succès.",
      email: newUser.email,
      firstname: newUser.firstname,
      lastname: newUser.lastname,
      profileImage: newUser.profileImage,
      userId: newUser._id,
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
exports.login = (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: "Utilisateur non trouvé !" });
      }

      bcrypt
        .compare(req.body.password.trim(), user.password)
        .then((valid) => {
          if (!valid) {
            console.log("Paire username/password incorrecte");
            return res
              .status(401)
              .json({ error: "Paire username/password incorrecte !" });
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
            },
            firstname,
            lastname,
            profileImage: user.profileImage,
            _id: user._id,
            access_token: jwt.sign(
              { userId: user._id },
              process.env.RANDOM_SECRET_TOKEN || "secret_key",
              { expiresIn: "24h" }
            ),
          });
        })
        .catch((error) => {
          console.error("Erreur bcrypt:", error);
          res.status(500).json({ error });
        });
    })
    .catch((error) => {
      console.error("Erreur lors de la recherche de l'utilisateur:", error);
      res.status(500).json({ error });
    });
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
      "_id email firstname lastname profileImage"
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
      },
      accessToken: token,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification du token:", error);
    res.status(401).json({ isValid: false, message: "Token invalide." });
  }
};
