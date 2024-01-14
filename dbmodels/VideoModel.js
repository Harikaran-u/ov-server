const mongoose = require("mongoose");

const { Schema } = mongoose;

const newVideo = new Schema(
  {
    videoName: {
      type: String,
      required: true,
      default: "new video",
    },
    videoUrl: {
      type: String,
      required: true,
    },
    subtitles: {
      type: [{ start: String, end: String, text: String }],
      default: [],
    },
    userId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Video = mongoose.model("videos", newVideo);

module.exports = Video;
