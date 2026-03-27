const mongoose = require("mongoose");

const SponsorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, lowercase: true },
    image: { type: String, default: null },
    websiteUrl: { type: String, default: null, trim: true, lowercase: true },
    created_by_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Unicité par compte
SponsorSchema.index({ created_by_id: 1, name: 1 }, { unique: true });
// Image unique par compte (ignore null/absent)
SponsorSchema.index(
  { created_by_id: 1, image: 1 },
  { unique: true, partialFilterExpression: { image: { $type: "string" } } }
);

// URL site unique par compte (ignore null/absent)
SponsorSchema.index(
  { created_by_id: 1, websiteUrl: 1 },
  {
    unique: true,
    partialFilterExpression: { websiteUrl: { $type: "string" } },
  }
);

module.exports = mongoose.model("Sponsor", SponsorSchema);
