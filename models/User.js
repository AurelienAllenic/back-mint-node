const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String, required: false },
  lastname: { type: String, required: false },
  role: { type: String, default: "coureur", enum: ["visitor", "coureur", "organisateur"] },
  profileImage: { type: String, required: false },
  isPremium: { type: Boolean, default: false },
  // Sponsor personnel du coureur (CRUD via compte / inscription facultatif)
  runnerSponsor: {
    name: { type: String, trim: true },
    image: { type: String, default: null },
  },
});

// Hash password before saving it
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Comparing password
UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", UserSchema);
