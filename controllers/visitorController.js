const VisitorCode = require("../models/VisitorCode");
const Race = require("../models/Race");
const { v4: uuidv4 } = require("uuid");

// Générer un code visiteur pour une course par un runner
exports.generateVisitorCode = async (req, res) => {
  try {
    const { raceId, runnerId } = req.body;

    const race = await Race.findById(raceId);
    if (!race) return res.status(404).json({ message: "Course non trouvée" });

    // Vérifie que le runner fait bien partie de cette course
    const isRunner = race.runners.some((id) => id.toString() === runnerId);
    if (!isRunner) {
      return res
        .status(403)
        .json({ message: "Ce runner ne participe pas à cette course." });
    }

    const code = uuidv4().split("-")[0];

    const newCode = await VisitorCode.create({ code, raceId, runnerId });

    res.status(201).json({ code: newCode.code });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Récupérer les infos d'une course via le code visiteur
exports.getRaceFromCode = async (req, res) => {
  try {
    const { code } = req.params;

    const visitorCode = await VisitorCode.findOne({ code });
    if (!visitorCode)
      return res.status(404).json({ message: "Code invalide ou expiré." });

    const race = await Race.findById(visitorCode.raceId).populate(
      "owner organization runners"
    );

    if (!race) return res.status(404).json({ message: "Course introuvable." });

    res.status(200).json({
      race,
      sharedByRunner: visitorCode.runnerId,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
