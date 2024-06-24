const urlConstants = {
  USER_REGISTER: "/register",
  USER_LOGIN: "/login",
  VERIFY_EMAIL: "/email/verification",
  RESEND_VERIFY_EMAIL: "/email/resend-verification",
  USER_LOGIN_WITH_GOOGLE: "/loign-with-google",

  REFRESH_TOKEN: "/token",
  GET_USER_LIST: "/users/list",

  GET_USER_BY_ID: '/user/:id',
  GET_OPTIONS_LIST: '/options',

  FORGOT_PASSWORD: "/forgot-password",
  CHANGE_PASSWORD: "/change-password",
  RESET_PASSWORD: "/reset-password",
};

module.exports = urlConstants;
