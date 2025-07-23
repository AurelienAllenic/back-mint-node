const mongoose = require("mongoose");

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    media_avatar_id: { type: Number },
    media_banner_id: { type: Number },
    created_by_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", OrganizationSchema);
