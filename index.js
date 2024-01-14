const express = require("express");
const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const expFileUpload = require("express-fileupload");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

const app = express();
const port = 3000;
const secretTokenKey = "My_Secret_Token";

const corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessStatus: 200,
};

dotenv.config();
app.use(express.json());
app.use(expFileUpload());
app.use(cors(corsOptions));

//configuring cloudinary

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

// db_models
const connection_url = process.env.MONGODB_URL;

const User = require("./dbmodels/UserModel");
const Video = require("./dbmodels/VideoModel");

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

app.post("/upload/:userId", async (req, res) => {
  const userId = req.params.userId;
  let videoId;
  // console.log(userId);
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: "No files were uploaded." });
    } else {
      const videoFile = req.files.video;
      const videoBuffer = videoFile.data;

      const saveFileToDb = async (url) => {
        const newVideo = new Video({
          videoName: videoFile.name,
          videoUrl: url,
          userId: userId,
        });

        const savedFile = await newVideo.save();
        videoId = savedFile._id;
        const user = await User.findById({ _id: userId });

        if (user) {
          user.myVideos.push(videoId);
          await user.save();
          return videoId;
        }
        return false;

        // console.log(savedFile);
      };

      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          chunk_size: 6000000,
          timeout: 600000,
        },
        (error, result) => {
          if (error) {
            return res
              .status(500)
              .json({ message: "Upload cloudinary fails", error: error });
          } else {
            const publicUrl = result.secure_url;

            const getVideoIdAndSendData = async () => {
              const isVideoId = await saveFileToDb(publicUrl);
              if (isVideoId) {
                return res.status(201).json({
                  message: "Video uploaded successfully",
                  data: {
                    name: videoFile.name,
                    secure_url: publicUrl,
                    videoId: isVideoId,
                  },
                });
              } else {
                res.status(500).json({ message: "Video upload error" });
              }
              console.log(result);
            };
            getVideoIdAndSendData();
          }
        }
      );

      stream.write(videoBuffer);
      stream.end();
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server side issue", error });
  }
});

//upload-subtitle

app.post("/subtitles/:videoId", async (req, res) => {
  const subtitlesArray = req.body.subtitlesArray;
  const videoId = req.params.videoId;

  const subLen = subtitlesArray.length;

  if (subLen === 0) {
    res.status(404).json({ message: "Please provide subtitles" });
  }

  // Save subtitles to MongoDB

  const convertToSrt = (subtitles) => {
    let srtContent = "";

    subtitles.forEach((subtitle) => {
      srtContent += `${subtitle.start} --> ${subtitle.end}\n>> ${subtitle.text}\n\n`;
    });

    return srtContent;
  };

  try {
    const video = await Video.findById({ _id: videoId });
    if (!video) {
      res.status(404).json({ message: "Video not found" });
    } else {
      const srtContent = convertToSrt(subtitlesArray);

      const webVTTContent = `WEBVTT
  
  ${srtContent}`;

      fs.writeFileSync("subtitle.vtt", webVTTContent);

      cloudinary.uploader.upload(
        "subtitle.vtt",
        { resource_type: "raw" },
        async (error, result) => {
          if (error) {
            return res
              .status(500)
              .json({ error: "Error uploading to Cloudinary" });
          } else {
            fs.unlinkSync("subtitle.vtt");
            video.subtitles.push(result.secure_url);
            await video.save();
            res.status(201).json({
              vttUrl: result.secure_url,
              message: "Subtitles saved successfully",
            });
          }
        }
      );
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server side error", error });
  }
});

//get subtitles

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
