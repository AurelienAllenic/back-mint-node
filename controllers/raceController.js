const Race = require("../models/Race");

// Créer une course
exports.createRace = async (req, res) => {
  try {
    const race = new Race({ ...req.body, owner: req.userId });
    await race.save();
    // Adapter la réponse pour le front
    // runners: tableau d'emails si possible, sinon d'ids
    // startLocation/endLocation/route à parser du GPX si besoin (ici fictif)
    let startLocation = { latitude: 0, longitude: 0 };
    let endLocation = { latitude: 0, longitude: 0 };
    let route = [];
    let gpxFileName = race.gpxFile ? race.gpxFile.split("/").pop() : "";
    // runners: emails si peuplé, sinon ids
    let runners = Array.isArray(race.runners)
      ? race.runners.map((r) => (r.email ? r.email : r.toString()))
      : [];
    res.status(201).json({
      id: race._id.toString(),
      name: race.name,
      runners,
      startLocation,
      endLocation,
      createdBy: req.user ? req.user.email : req.userId,
      route,
      startDate: race.startDate
        ? race.startDate.toISOString().split("T")[0]
        : "",
      endDate: race.endDate ? race.endDate.toISOString().split("T")[0] : "",
      startTime: race.startDate
        ? race.startDate.toISOString().split("T")[1]?.substring(0, 8)
        : "",
      endTime: race.endDate
        ? race.endDate.toISOString().split("T")[1]?.substring(0, 8)
        : "",
      gpxFileName,
    });
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
    // Adapter le format pour le front
    const formatted = races.map((race) => {
      // Extraction des infos GPX (si stockées en string, à adapter si besoin)
      // startLocation/endLocation fictifs ici, à adapter selon ton modèle GPX
      let startLocation = { latitude: 0, longitude: 0 };
      let endLocation = { latitude: 0, longitude: 0 };
      let routeLength = 0;
      let gpxFileName = race.gpxFile ? race.gpxFile.split("/").pop() : "";
      // Si tu stockes les points GPX dans gpxFile, tu peux parser ici
      // runnersCount = nombre de coureurs inscrits
      return {
        id: race._id.toString(),
        name: race.name,
        createdBy:
          race.owner && race.owner.email
            ? race.owner.email
            : race.owner
            ? race.owner.toString()
            : "",
        startDate: race.startDate
          ? race.startDate.toISOString().split("T")[0]
          : "",
        endDate: race.endDate ? race.endDate.toISOString().split("T")[0] : "",
        startTime: race.startDate
          ? race.startDate.toISOString().split("T")[1]?.slice(0, 5)
          : "",
        endTime: race.endDate
          ? race.endDate.toISOString().split("T")[1]?.slice(0, 5)
          : "",
        startLocation,
        endLocation,
        routeLength,
        runnersCount: race.runners ? race.runners.length : 0,
        gpxFileName,
      };
    });
    res.status(200).json(formatted);
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
