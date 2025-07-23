const Race = require("../models/Race");

// Créer une course
exports.createRace = async (req, res) => {
  try {
    const race = new Race({ ...req.body, owner: req.userId });
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
