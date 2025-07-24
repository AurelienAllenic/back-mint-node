const mongoose = require("mongoose");

const VisitorCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  raceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Race",
    required: true,
  },
  runnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now, expires: "2h" },
});

module.exports = mongoose.model("VisitorCode", VisitorCodeSchema);
