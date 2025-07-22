const Organization = require("../models/Organization");

// Créer une organisation
exports.createOrganization = async (req, res) => {
  try {
    const org = new Organization(req.body);
    await org.save();
    res.status(201).json(org);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Erreur lors de la création de l'organisation.",
        error,
      });
  }
};

// (Optionnel) Lister les organisations
exports.getOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.find();
    res.status(200).json(orgs);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Erreur lors de la récupération des organisations.",
        error,
      });
  }
};
