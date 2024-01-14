# Online-Video-Player API
---
**This API helps you to upload your favorite video and play with your custom subtitles**

## API Routes

1. Register - Accepts
   1. username - (4,16) - (min,max) - lengths
   2. password - (4,16) - (min,max) - lengths
   3. returns userId
   4. error handling
2. Login - Accepts
   1. username
   2. password
   3. returns Authorization JWT Token
   4. error handling
3. Upload - Accepts
   1. FormData video file(only)
   2. Parses and upload to Cloud platform
   3. returns video url & video Id
   4. stores video id to respective user collection
   5. error handling
4. Upload - Accepts
   1. Subtitle texts
   2. accepts start time, end time, text joined together as srt format string
   3. returns playable vtt url file
   4. error handling

---
**API URL BASE & ENDPOINTS**
---
Published Base Url - https://online-video-server.onrender.com
---
Published Front End Url - https://ovplayerhk.netlify.app/
---
**End Points**
1. Register - https://online-video-server.onrender.com/register
   1. Body should contain above respected details
2. Login - https://online-video-server.onrender.com/login
   1. Body should contain above respected details
3. Upload Video - https://online-video-server.onrender.com/upload/
4. Upload Subtitle - https://online-video-server.onrender.com/upload/videoId
   1. VideoId is path parameter
**Usage**
1. You can clone repositary and install npm packages
2. You should use your .env file
3. .env file should include followings
   1. mongo_db_url
   2. cloudinary_api
   3. cloudinary_key
   4. cloudinary_access_token
4. Note - Change .env based on your Db and Cloud storage


