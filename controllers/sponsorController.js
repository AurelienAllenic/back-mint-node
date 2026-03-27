const Sponsor = require("../models/Sponsor");

// Creer un sponsor
exports.createSponsor = async (req, res) => {
  try {
    const { name, image, websiteUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Le nom du sponsor est requis." });
    }

    if (websiteUrl && typeof websiteUrl !== "string") {
      return res.status(400).json({ message: "websiteUrl invalide." });
    }

    const sponsor = new Sponsor({
      name: name.trim(),
      image: image || null,
      websiteUrl: websiteUrl ? websiteUrl.trim() : null,
      created_by_id: req.userId,
      owner_id: req.userId,
    });

    await sponsor.save();

    res.status(201).json({
      id: sponsor._id.toString(),
      name: sponsor.name,
      image: sponsor.image,
      websiteUrl: sponsor.websiteUrl,
    });
  } catch (error) {
    // Gestion d'unicité (Mongo duplicate key)
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0];

      if (field === "name") {
        return res.status(409).json({
          message: "Un sponsor avec ce nom existe déjà pour ce compte.",
        });
      }

      if (field === "image") {
        return res.status(409).json({
          message: "Un sponsor avec cette image existe déjà pour ce compte.",
        });
      }

      if (field === "websiteUrl") {
        return res.status(409).json({
          message: "Un sponsor avec cette URL de site existe déjà pour ce compte.",
        });
      }

      return res.status(409).json({
        message: "Un sponsor identique existe déjà pour ce compte.",
      });
    }

    res
      .status(500)
      .json({ message: "Erreur lors de la creation du sponsor.", error });
  }
};

// Lister les sponsors du compte
exports.getSponsors = async (req, res) => {
  try {
    const sponsors = await Sponsor.find({ created_by_id: req.userId });

    const formatted = sponsors.map((sponsor) => ({
      id: sponsor._id.toString(),
      name: sponsor.name,
      image: sponsor.image,
      websiteUrl: sponsor.websiteUrl,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la recuperation des sponsors.", error });
  }
};
