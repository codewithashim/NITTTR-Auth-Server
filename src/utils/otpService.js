const Otp = require("../models/otp");
const twilioClient = require("../config/twilioConfig");

const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber.startsWith("+")) {
    return `+91${phoneNumber}`;
  }
  return phoneNumber;
};

const saveOtpToDatabase = async (number) => {
  const existingOtpRecord = await Otp.findOne({ number });

  if (existingOtpRecord) {
    const now = new Date();
    if (existingOtpRecord.expiresAt > now) {
      return existingOtpRecord.otp;
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      existingOtpRecord.otp = otp;
      existingOtpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await existingOtpRecord.save();
      return otp;
    }
  } else {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpRecord = new Otp({ number, otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
    await otpRecord.save();
    return otp;
  }
};


const sendOtpToUser = async (phoneNumber, otp) => {
  try {
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    const message = await twilioClient.messages.create({
      body: `Your OTP is ${otp}`,
      to: formattedPhoneNumber,
      from: "+16614635601",
    });
    console.log(`OTP sent successfully: ${message.sid}`);
    return otp;
  } catch (error) {
    console.error("Error sending OTP via Twilio:", error);
    throw new Error("Failed to send OTP");
  }
};


const verifyOtpFromDatabase = async (number, otp) => {
  try {
    const otpRecord = await Otp.findOne({ number });

    if (!otpRecord) {
      return { verified: false, msg: "OTP not found" };
    }

    const now = new Date();
    if (otpRecord.expiresAt < now) {
      return { verified: false, msg: "OTP has expired" };
    }

    if (otpRecord.otp !== otp) {
      return { verified: false, msg: "Incorrect OTP" };
    }

    return { verified: true };
  } catch (err) {
    console.error(`Error verifying OTP: ${err.message}`);
    throw new Error("Internal Server Error");
  }
};



module.exports = {
  saveOtpToDatabase,
  verifyOtpFromDatabase,
  sendOtpToUser,
};
