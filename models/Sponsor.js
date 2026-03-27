const mongoose = require("mongoose");

const SponsorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    created_by_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sponsor", SponsorSchema);
