// ====== auth controller
const { messageConstants } = require("../../constants");
const authService = require("../../service/auth");
const { logger } = require("../../utils");
const { getUserData } = require("../../middleware");

 
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
    const response = await authService.signIn({
      provider: "google",
      token: req.body.token, 
    }, res);
    logger.info(
      `${messageConstants.RESPONSE_FROM} signin with Google API`,
      JSON.stringify(response)
    );
    res.send(response);
  } catch (err) {
    logger.error(`Signin with Google ${messageConstants.API_FAILED} ${err}`);
    res.send(err);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const response = await authService.verifyEmail(req, res);
    console.log(response , "response")
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
  signInWithGoogle
};
