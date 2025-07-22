const express = require("express");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const corsConfig = require("./config/corsConfig");
const authRoutes = require("./routes/authRoutes");

require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3000;
connectDB();

app.use(corsConfig);
app.options("*", corsConfig);
app.use(bodyParser.json({ limit: "15mb" }));
app.use(bodyParser.urlencoded({ limit: "15mb", extended: true }));

app.get("/", (req, res) => {
  res.status(200).json("Welcome to the main route");
});

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;
