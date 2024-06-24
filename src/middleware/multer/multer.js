const multer = require("multer");

// use memory storage to store files as buffer 
const storage = multer.memoryStorage();

const upload = multer({ storage: storage, });

module.exports = {
  upload,
}
