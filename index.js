const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors')
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const organizationRoutes = require("./routes/organizationRoutes");
const sponsorRoutes = require("./routes/sponsorRoutes");

require("dotenv").config();


const raceRoutes = require("./routes/raceRoutes");
const userRoutes = require("./routes/userRoutes");
const visitorRoutes = require("./routes/visitorRoutes");
const statsRoutes = require("./routes/statsRoutes");
const invitationRoutes = require("./routes/invitationRoutes");


const app = express();
const PORT = process.env.PORT || 3000;
connectDB();

app.use(cors())
app.use(bodyParser.json({ limit: "15mb" }));
app.use(bodyParser.urlencoded({ limit: "15mb", extended: true }));

app.get("/", (req, res) => {
  res.status(200).json("Welcome to the main route");
});

// Importer et utiliser les routes de redirection
const redirectRoutes = require("./routes/redirectRoutes");
app.use("/", redirectRoutes);

app.use("/auth", authRoutes);

app.use("/organizations", organizationRoutes);
app.use("/sponsors", sponsorRoutes);

app.use("/race", raceRoutes);

app.use("/users", userRoutes);

app.use("/visitor", visitorRoutes);

app.use("/stats", statsRoutes);

app.use("/invitations", invitationRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;
