const mongoose = require("mongoose");
const crypto = require("crypto");

const RaceInvitationSchema = new mongoose.Schema(
  {
    race: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Race",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      default: "pending",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Rempli quand l'user accepte l'invitation
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire dans 7 jours
    },
  },
  { timestamps: true }
);

// Index pour recherche rapide
RaceInvitationSchema.index({ email: 1, race: 1 });
RaceInvitationSchema.index({ token: 1 });
RaceInvitationSchema.index({ status: 1 });
RaceInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Suppression automatique après expiration

// Méthode pour vérifier si l'invitation est valide
RaceInvitationSchema.methods.isValid = function () {
  return (
    this.status === "pending" &&
    this.expiresAt > new Date()
  );
};

module.exports = mongoose.model("RaceInvitation", RaceInvitationSchema);
