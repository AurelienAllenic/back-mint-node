const multer = require("multer");
const path = require("path");

// Configuration de stockage pour les fichiers GPX
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Créer le dossier uploads/gpx s'il n'existe pas
    const uploadPath = path.join(__dirname, "../uploads/gpx");
    const fs = require("fs");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Nom du fichier : timestamp + nom original
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// Filtre pour n'accepter que les fichiers GPX
const fileFilter = (req, file, cb) => {
  console.log("Fichier reçu:", file);

  // Accepter les fichiers GPX et XML
  if (
    file.mimetype === "application/gpx+xml" ||
    file.mimetype === "application/xml" ||
    file.mimetype === "text/xml" ||
    file.originalname.toLowerCase().endsWith(".gpx")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Seuls les fichiers GPX sont autorisés"), false);
  }
};

// Configuration multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Middleware pour upload d'un seul fichier GPX
const uploadGpx = upload.single("gpxFile");

// Wrapper pour gérer les erreurs multer
const handleGpxUpload = (req, res, next) => {
  uploadGpx(req, res, (err) => {
    if (err) {
      console.error("Erreur upload GPX:", err);
      return res.status(400).json({
        message: "Erreur lors de l'upload du fichier GPX",
        error: err.message,
      });
    }
    next();
  });
};

module.exports = { handleGpxUpload };
