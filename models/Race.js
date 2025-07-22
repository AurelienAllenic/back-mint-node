const mongoose = require("mongoose");

const RaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    runners: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    gpxFile: { type: String }, // URL ou chemin du fichier GPX
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Race", RaceSchema);
