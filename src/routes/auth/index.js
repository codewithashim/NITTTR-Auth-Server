const { urlConstants } = require("../../constants");
const { authValidator, jsonWebToken } = require("../../middleware");
const api = require("../../controller/auth");
const userAPI = require("../../controller/user");

module.exports = (app) => {
  app.post(
    urlConstants.USER_REGISTER,
    authValidator.signUpValidation,
    api.signUp
  );
  app.post(urlConstants.USER_LOGIN, authValidator.signInValidation, api.signIn);
  app.post(
    urlConstants.USER_LOGIN_WITH_GOOGLE,
    authValidator.signInWithGoogleValidation,
    api.signInWithGoogle
  );
  app.post(
    urlConstants.VERIFY_EMAIL,
    authValidator.emailVerifyValidation,
    api.verifyEmail
  );
  app.post(urlConstants.RESEND_VERIFY_EMAIL, api.resendEmailVerification);
  app.post(urlConstants.SEND_OTP, api.sendOtp);
  app.post(urlConstants.VERIFY_OTP, api.verifyOtp);
  app.post(urlConstants.VERIFY_MOBILE, api.verifyPhone);
  app.post(urlConstants.USER_EXISTANCE, api.verifyUserExistence);
  app.post(
    urlConstants.VERIFY_GOOGLE_PHONE_NUMBER,
    api.verifyGooglePhoneNumber
  );

  //TODO Refresh Token

  app.get(
    urlConstants.GET_USER_BY_ID,
    jsonWebToken.validateToken,
    userAPI.getUserById
  );
  app.get(
    urlConstants.GET_OPTIONS_LIST,
    jsonWebToken.validateToken,
    userAPI.getOptionsList
  );
  app.get(
    urlConstants.GET_USER_LIST,
    jsonWebToken.validateToken,
    userAPI.getUserList
  );
  app.post(
    urlConstants.FORGOT_PASSWORD,
    authValidator.forgotPasswordValidation,
    userAPI.forgotPassword
  );
  app.post(
    urlConstants.CHANGE_PASSWORD,
    jsonWebToken.validateToken,
    authValidator.changePasswordValidation,
    userAPI.changePassword
  );
  app.post(
    urlConstants.RESET_PASSWORD,
    jsonWebToken.validateToken,
    authValidator.resetPasswordValidation,
    userAPI.resetPassword
  );
};
