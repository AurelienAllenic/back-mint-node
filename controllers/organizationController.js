const Organization = require("../models/Organization");

// Créer une organisation
exports.createOrganization = async (req, res) => {
  try {
    const org = new Organization(req.body);
    await org.save();
    // Adapter la réponse pour le front : id (string), name
    res.status(201).json({
      id: org._id.toString(),
      name: org.name,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la création de l'organisation.",
      error,
    });
  }
};

// (Optionnel) Lister les organisations
exports.getOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.find();
    // Adapter le format pour le front : id (string), name
    const formatted = orgs.map((org) => ({
      id: org._id.toString(),
      name: org.name,
    }));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des organisations.",
      error,
    });
  }
};
