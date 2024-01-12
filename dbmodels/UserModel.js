const mongoose = require("mongoose");

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      min: 4,
      max: 16,
    },
    password: {
      type: String,
      required: true,
      min: 6,
      max: 16,
    },
  },
  {
    timestamps: true,
  }
);

const Users = mongoose.model("Users", UserSchema);

module.exports = Users;
