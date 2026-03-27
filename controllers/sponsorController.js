const Sponsor = require("../models/Sponsor");

// Creer un sponsor
exports.createSponsor = async (req, res) => {
  try {
    const { name, image } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Le nom du sponsor est requis." });
    }

    const sponsor = new Sponsor({
      name: name.trim(),
      image: image || null,
      created_by_id: req.userId,
      owner_id: req.userId,
    });

    await sponsor.save();

    res.status(201).json({
      id: sponsor._id.toString(),
      name: sponsor.name,
      image: sponsor.image,
    });
  } catch (error) {
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
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la recuperation des sponsors.", error });
  }
};
