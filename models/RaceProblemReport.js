const mongoose = require("mongoose");

const RaceProblemReportSchema = new mongoose.Schema(
  {
    raceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Race",
      required: true,
    },
    runner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: ["blessure", "malaise", "balisage", "danger", "abandon", "autre"],
      required: true,
    },
    reasonLabel: {
      type: String,
    },
    details: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
  },
  { timestamps: true }
);

// Index pour recherche rapide des signalements d'une course
RaceProblemReportSchema.index({ raceId: 1, createdAt: -1 });

module.exports = mongoose.model("RaceProblemReport", RaceProblemReportSchema);
