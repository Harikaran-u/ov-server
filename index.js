const express = require("express");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const expFileUpload = require("express-fileupload");

const app = express();
const port = 3000;
const secretTokenKey = "My_Secret_Token";

const corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessStatus: 200,
};

// db_models

const User = require("./dbmodels/UserModel");

dotenv.config();
app.use(express.json());
app.use(expFileUpload());
app.use(cors(corsOptions));

const connection_url = process.env.MONGODB_URL;

async function connectDb() {
  try {
    await mongoose.connect(connection_url);
    console.log("Successfully connected to MongoDb");
  } catch (error) {
    console.log("db error", error);
  }
}

connectDb();

//Middleware - Handling user credentials

const validateUserCredentials = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const response = await User.findOne({ username });

    if (response) {
      res.status(409).json({ message: "User already present" });
    } else {
      const minUserNameChar = 4;
      const maxUserNameChar = 16;
      const minPasswordChar = 6;
      const maxPasswordChar = 16;
      const userNameLength = username.length;
      const userPwdLength = password.length;

      const isValidUserCredential =
        username !== "" &&
        username !== undefined &&
        password !== "" &&
        password !== undefined;

      const isValidUserLength =
        userNameLength >= minUserNameChar && userNameLength <= maxUserNameChar;

      const isValidPwdLength =
        userPwdLength >= minPasswordChar && userPwdLength <= maxPasswordChar;

      const isValidLength = isValidUserLength && isValidPwdLength;

      if (isValidUserCredential && isValidLength) {
        next();
      } else {
        res.status(401).json({
          message: "Please provide valid user credentials",
          validCredentials: {
            username:
              "username should present & length of the chars (min, max) - (4, 16)",
            password:
              "password should present & length of the chars (min, max) - (6, 16)",
          },
        });
      }
    }
  } catch (e) {
    res.status(503).json({ message: "server side error", error: e });
  }
};

//create new user end point

app.post("/register", validateUserCredentials, async (req, res) => {
  const { username, password } = req.body;
  const hashedPwd = await bcrypt.hash(password, 15);
  try {
    const user = new User({ username, password: hashedPwd });
    const userId = user._id;
    await user.save();

    res.status(200);
    res.json({
      message: "Successfully registerd.Please kindly Login",
      userId: userId,
    });
  } catch (err) {
    res.status(500);
    res.json({ message: "Internal Server Error", error: err });
  }
});

//Login user

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const validUser = await User.findOne({ username });

    if (validUser) {
      const userPwd = validUser.password;
      const userId = validUser._id;
      const isValidPassword = await bcrypt.compare(password, userPwd);

      if (isValidPassword) {
        const payload = JSON.stringify({ username: username });
        const jwtToken = JWT.sign(payload, secretTokenKey);
        res.status(200).json({
          message: "Login successful",
          AuthToken: jwtToken,
          userId: userId,
        });
      } else {
        res.status(401);
        res.json({ message: "Invalid password.Please provide valid password" });
      }
    } else {
      res.status(401);
      res.json({
        message: "Invalid user.Please kindly provide valid user credentials.",
      });
    }
  } catch (error) {
    res.status(500);
    res.json({ message: "Internal server error", err: error });
  }
});

//upload-video

app.post("/upload", async (req, res) => {
  const videoFile = req.files.video;
  const videoBuffer = videoFile.data;
  console.log(videoBuffer);
  // console.log(req.files);
  // console.log(req.files.video);
  res
    .status(200)
    .json({ message: "File received successfully", body: "summa" });
});

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
