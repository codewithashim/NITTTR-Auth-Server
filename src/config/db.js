const mongoose = require("mongoose");
const { logger } = require("../utils");
const { messageConstants } = require("../constants");

const connectDb = async () => {
  try {
    var dbURI = process.env.DB_URL;
    if (!dbURI) {
      throw new Error("DB_URL environment variable not set");
    }
    let connection = await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info(`Database ${messageConstants.CONNECTED_SUCCESSFULLY}`);
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDb;
