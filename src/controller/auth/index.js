// ====== auth controller
const { messageConstants } = require("../../constants");
const authService = require("../../service/auth");
const { logger } = require("../../utils");
const { getUserData } = require("../../middleware");
const responseData = require("../../constants/responses");
const querystring = require("querystring");
const atob = require("atob");
const BookingSchema = require("../../models/bookingDetails");

const decodeJWT = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error(
        "Invalid token: expected 3 parts (header, payload, signature)."
      );
    }
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error.message || error);
    return null;
  }
};

const signUp = async (req, res) => {
  try {
    const response = await authService.signUp(req.body, res);
    logger.info(
      `${messageConstants.RESPONSE_FROM} signup API`,
      JSON.stringify(response)
    );
    res.send(response);
  } catch (err) {
    logger.error(`Signup ${messageConstants.API_FAILED} ${err}`);
    res.send(err);
  }
};

const sendOtp = async (req, res) => {
  try {
    const response = await authService.sendOtp(req.body);
    if (response.success) {
      logger.info(
        `${messageConstants.RESPONSE_FROM} Send OTP API`,
        JSON.stringify(response)
      );
      responseData.success(res, response.body, response.msg);
    } else {
      logger.error(`Send OTP ${messageConstants.API_FAILED} ${response.msg}`);
      responseData.fail(res, response.msg, response.status);
    }
  } catch (err) {
    logger.error(`Send OTP ${messageConstants.API_FAILED} ${err.message}`);
    responseData.fail(res, err.message, 500);
  }
};

// Verify OTP and Sign Up
const verifyOtp = async (req, res) => {
  try {
    const response = await authService.verifyOtp(req.body);
    logger.info(
      `${messageConstants.RESPONSE_FROM} Verify OTP API`,
      JSON.stringify(response)
    );

    if (response.success) {
      res.status(200).json(response);
    } else {
      res.status(response.status || 400).json(response);
    }
  } catch (err) {
    logger.error(`Verify OTP ${messageConstants.API_FAILED} ${err.message}`);
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};

const verifyPhone = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await authService.verifyPhoneNumber(email);

    if (user) {
      if (user.number) {
        return res
          .status(200)
          .json({ isVerified: true, phoneNumber: user.number });
      } else {
        return res.status(200).json({ isVerified: false });
      }
    } else {
      return res.status(404).json({ isVerified: false, msg: "User not found" });
    }
  } catch (error) {
    console.error(`Error verifying phone number: ${error}`);
    return res
      .status(500)
      .json({ isVerified: false, msg: "Internal Server Error" });
  }
};

const formatDateWithTimezone = (date) => {
  const pad = (number) => (number < 10 ? `0${number}` : number);

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const offset = date.getTimezoneOffset();
  const offsetSign = offset > 0 ? "-" : "+";
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMinutes = pad(Math.abs(offset) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
};

const createOrder = async (req, res) => {
  try {
    const orderData = {
      mercid: process.env.BILLDESK_MERCHANT_ID,
      orderid: req.body.orderid,
      amount: req.body.amount,
      order_date: formatDateWithTimezone(new Date()),
      currency: "356",
      ru: req.body.return_url,
      additional_info: {
        additional_info1: req.body.additional_info1,
        additional_info2: req.body.additional_info2,
      },
      itemcode: "DIRECT",
      device: {
        init_channel: "internet",
        ip: req.ip,
        user_agent: req.headers["user-agent"],
        accept_header: "text/html",
        browser_tz: "-330",
        browser_color_depth: "32",
        browser_java_enabled: "false",
        browser_screen_height: "601",
        browser_screen_width: "657",
        browser_language: "en-US",
        browser_javascript_enabled: "true",
      },
    };

    const orderResponse = await authService.createBillDeskOrder(orderData);
    return res.json(orderResponse);
  } catch (error) {
    console.error(`Error creating order: ${error}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const paymentCallback = async (req, res) => {
  try {
    const requestBody = req.body;
    let transaction_response;
    if (requestBody?.transaction_response) {
      transaction_response = requestBody.transaction_response;
    } else if (requestBody.encrypted_response) {
      const queryParams = querystring.parse(requestBody.encrypted_response);
      transaction_response = queryParams.transaction_response;
    } else {
      throw new Error("No transaction response found in the request body.");
    }

    if (!transaction_response) {
      throw new Error("No transaction response found");
    }

    const decodedResponse = decodeJWT(transaction_response);

    if (!decodedResponse) {
      throw new Error("Failed to decode transaction response");
    }
    const { auth_status, payment_method_type, additional_info, transactionid } =
      decodedResponse;
    const { additional_info1 } = additional_info;
    const bookingStatus = auth_status === "0300" ? "CONFIRMED" : "CANCELED";
    const paymentStatus = auth_status === "0300" ? "SUCCESS" : "FAILED";

    const result = await BookingSchema.findOneAndUpdate(
      { _id: additional_info1 },
      {
        $set: {
          bookPaymentId: transactionid,
          bookingStatus: bookingStatus,
          paymentStatus: paymentStatus,
        },
      },
      {
        new: true,
        upsert: true,
      }
    );
    if (auth_status === "0300") {
      res.redirect(
        `${process.env.BASE_URL}/payment/success/${additional_info1}?paymentStatus="CONFIRMED"`
      );
    } else {
      res.redirect(
        `${process.env.BASE_URL}/payment/success/${additional_info1}?paymentStatus="FAILED"`
      );
    }
  } catch (error) {
    console.error("Error handling payment callback:", error.message || error);
    res.status(500).send("Internal Server Error");
  }
};

const verifyUserExistence = async (req, res) => {
  try {
    const { email, number } = req.body;
    if (
      email !== "" ||
      number !== "" ||
      (number !== null && number !== undefined)
    ) {
      const user = await authService.verifyUserExistence(email, number);
      if (user) {
        return res.status(200).json({ exists: true, msg: "User exists", user });
      } else {
        return res
          .status(200)
          .json({ exists: false, msg: "User does not exist" });
      }
    }
  } catch (error) {
    console.error(`Error verifying user existence: ${error}`);
    return res
      .status(500)
      .json({ exists: false, msg: "Internal Server Error" });
  }
};

const retrieveTransaction = async (req, res) => {
  try {
    const { bdorderid } = req.body;
    const transactionResponse = await authService.retrieveTransaction(
      bdorderid
    );
    if (transactionResponse.success) {
      return res.json({
        success: true,
        transaction: transactionResponse.transaction,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, msg: transactionResponse.msg });
    }
  } catch (error) {
    console.error(`Error during transaction retrieval: ${error}`);
    return res
      .status(500)
      .json({ success: false, msg: "Internal Server Error" });
  }
};

const signIn = async (req, res) => {
  try {
    const response = await authService.signIn(req.body, res);
    logger.info(
      `${messageConstants.RESPONSE_FROM} signin API`,
      JSON.stringify(response)
    );
    res.send(response);
  } catch (err) {
    logger.error(`Signin ${messageConstants.API_FAILED} ${err}`);
    res.send(err);
  }
};

const signInWithGoogle = async (req, res) => {
  try {
    const response = await authService.signIn(
      {
        provider: "google",
        token: req.body.token,
      },
      res
    );
    logger.info(
      `${messageConstants.RESPONSE_FROM} signin with Google API`,
      JSON.stringify(response)
    );
    res.send(response);
  } catch (err) {
    logger.error(`Signin with Google ${messageConstants.API_FAILED} ${err}`);
    res.status(500).send({ error: "Google sign-in failed" });
  }
};

const verifyGooglePhoneNumber = async (req, res) => {
  try {
    const { email, number } = req.body;
    const otpValid = await authService.verifyOtp(req.body);
    if (otpValid) {
      const user = await authService.updateUserPhoneNumber(email, number);
      if (user) {
        return res.json({ success: true, user });
      } else {
        return res.status(404).json({ success: false, msg: "User not found" });
      }
    } else {
      return res.status(400).json({ success: false, msg: "Incorrect OTP" });
    }
  } catch (error) {
    console.error(`Error during phone number verification: ${error}`);
    return res
      .status(500)
      .json({ success: false, msg: "Internal Server Error" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const response = await authService.verifyEmail(req, res);
    console.log(response, "response");
    logger.info(
      `${messageConstants.RESPONSE_FROM} Email Verification API`,
      JSON.stringify(response)
    );
    res.send(response);
  } catch (err) {
    logger.error(`Signin ${messageConstants.API_FAILED} ${err}`);
    res.send(err);
  }
};

// ==== Resend Email Verification ==== controller
const resendEmailVerification = async (req, res) => {
  try {
    const response = await authService.resendEmailVerification(req, res);
    logger.info(
      `${messageConstants.RESPONSE_FROM} resendEmailVerification API`,
      JSON.stringify(response)
    );
    res.send(response);
  } catch (err) {
    logger.error(
      `resendEmailVerification API ${messageConstants.API_FAILED} ${err}`
    );
    res.send(err);
  }
};

// ==== User Profile ====

const getUserList = async (req, res) => {
  try {
    const userData = await getUserData(req, res);
    const response = await authService.getUserList(res, userData);
    logger.info(
      `${messageConstants.RESPONSE_FROM} getUserList API`,
      JSON.stringify(jsonData)
    );
    res.send(response);
  } catch (err) {
    logger.error(`GetUserList ${messageConstants.API_FAILED} ${err}`);
    res.send(err);
  }
};

const resetPassword = async (req, res) => {
  try {
    const userData = await getUserData(req, res);
    const response = await authService.resetPassword(req.body, userData, res);
    logger.info(
      `${messageConstants.RESPONSE_FROM} resetPassword API`,
      JSON.stringify(response)
    );
    res.send(response);
  } catch (err) {
    logger.error(`Reset Password ${messageConstants.API_FAILED}`, err);
    res.send(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const response = await authService.forgotPassword(req, res, next);
    logger.info(
      `${messageConstants.RESPONSE_FROM} forgotPassword API`,
      JSON.stringify(response)
    );
    res.send(response);
  } catch (err) {
    logger.error(`Forgot Password ${messageConstants.API_FAILED}`, err);
    res.send(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const userData = await getUserData(req, res);
    const response = await authService.changePassword(
      req.body,
      userData,
      res,
      next
    );
    logger.info(
      `${messageConstants.RESPONSE_FROM} changePassword API`,
      JSON.stringify(response)
    );
    res.send(response);
  } catch (err) {
    logger.error(`Change Password ${messageConstants.API_FAILED}`, err);
    res.send(err);
  }
};

module.exports = {
  signUp,
  signIn,
  getUserList,
  forgotPassword,
  changePassword,
  resetPassword,
  verifyEmail,
  resendEmailVerification,
  signInWithGoogle,
  sendOtp,
  verifyOtp,
  verifyPhone,
  createOrder,
  retrieveTransaction,
  verifyUserExistence,
  verifyGooglePhoneNumber,
  createOrder,
  paymentCallback,
};
