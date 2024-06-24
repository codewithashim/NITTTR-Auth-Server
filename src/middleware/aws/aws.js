const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

const uploadFile = async (fileBuffer, originalname, contentType, folderName) => {
  const fileStream = fs.createReadStream(fileBuffer);
  const key = `${folderName}/${uuidv4()}-${originalname}`;
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Body: fileStream,
    ContentType: contentType,
    Key: key
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;

    return fileUrl;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
};

const deleteFile = async (key) => {
  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new DeleteObjectCommand(deleteParams);
    await s3.send(command);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
}

module.exports = {
  uploadFile,
  deleteFile
};