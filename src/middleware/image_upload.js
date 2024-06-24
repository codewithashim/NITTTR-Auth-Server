const path = require("path");
const multer = require('multer');

const storage = multer.diskStorage({
    // destination: './public/uploads', // Where to store the uploaded images
    filename: (req, file, callback) => {
      const uniqueSuffix = req.userId;
      callback(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  });
  
const upload = multer({ storage: storage });
module.exports = upload;