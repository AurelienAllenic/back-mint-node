const cors = require("cors");

const corsOptions = {
  origin: true, // Reflète l'origin de la requête (compatible avec credentials)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const corsConfig = (req, res, next) => {
  cors(corsOptions)(req, res, () => {
    if (req.method === "OPTIONS") {
      res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
      return res.status(200).send();
    }
    next();
  });
};

module.exports = corsConfig;
