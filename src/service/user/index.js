const {
  responseData,
  messageConstants,
  mailSubjectConstants,
  mailTemplateConstants,
} = require("../../constants");
const { cryptoGraphy, jsonWebToken } = require("../../middleware");
const UserSchema = require("../../models/users");
const { logger, mail } = require("../../utils");
const { createJsonWebTokenForUser } = require("../../service/auth");

const resetPassword = async (body, userData, res) => {
  return new Promise(async () => {
    body["old_password"] = cryptoGraphy.encrypt(body.old_password);
    const user = await UserSchema.findOne({ _id: userData._id });
    if (body.old_password !== user.password) {
      logger.error(
        `${messageConstants.OLD_PASSWORD_NOT_MATCHED} with ${body.old_password}`
      );
      return responseData.fail(
        res,
        messageConstants.OLD_PASSWORD_NOT_MATCHED,
        403
      );
    } else {
      body["new_password"] = cryptoGraphy.encrypt(body.new_password);
      await UserSchema.findOneAndUpdate(
        {
          _id: user._id,
        },
        {
          password: body["new_password"],
        }
      ).then(async (result) => {
        if (result.length !== 0) {
          const mailContent = {
            name: user.name,
            email: user.email,
          };
          await mail.sendMailtoUser(
            mailTemplateConstants.RESET_PASS_TEMPLATE,
            user.email,
            mailSubjectConstants.RESET_PASS_SUBJECT,
            res,
            mailContent
          );
          logger.info(`${messageConstants.PASSWORD_RESET} for ${user.email}`);
          return responseData.success(res, {}, messageConstants.PASSWORD_RESET);
        } else {
          logger.error(
            `${messageConstants.PASSWORD_NOT_RESET} for ${user.email}`
          );
          return responseData.fail(
            res,
            messageConstants.PASSWORD_NOT_RESET,
            403
          );
        }
      });
    }
  });
};

const forgotPassword = async (req, res, next) => {
  return new Promise(async () => {
    const user = await UserSchema.findOne({ email: req.body.email });
    if (user) {
      if (user.token) {
        await jsonWebToken.validateToken(req, res, next, user.token);
      } else {
        await createJsonWebTokenForUser(user);
      }
      await forgotPasswordLink(res, user);
    } else {
      logger.error(messageConstants.USER_NOT_FOUND);
      return responseData.success(res, [], messageConstants.USER_NOT_FOUND);
    }
  });
};

const changePassword = async (body, user, res) => {
  return new Promise(async () => {
    body["new_password"] = cryptoGraphy.encrypt(body.new_password);
    await UserSchema.findOneAndUpdate(
      {
        _id: user._id,
      },
      {
        password: body["new_password"],
      }
    ).then(async (result) => {
      if (result.length !== 0) {
        const mailContent = {
          name: user.name,
          email: user.email,
        };
        await mail.sendMailtoUser(
          mailTemplateConstants.FORGOTTED_PASS_TEMPLATE,
          user.email,
          mailSubjectConstants.FORGOTTED_PASS_SUBJECT,
          res,
          mailContent
        );
        logger.info(`${messageConstants.PASSWORD_FORGOT} for ${user.email}`);
        return responseData.success(res, {}, messageConstants.PASSWORD_FORGOT);
      } else {
        logger.error(
          `${messageConstants.PASSWORD_NOT_FORGOT} for ${user.email}`
        );
        return responseData.fail(
          res,
          messageConstants.PASSWORD_NOT_FORGOT,
          403
        );
      }
    });
  });
};

const getUserList = async (res, userData) => {
  return new Promise(async () => {
    await UserSchema.find(
      {
        _id: { $ne: userData._id },
      },
      { _id: 1, name: 1, email: 1 }
    )
      .then(async (result) => {
        if (result.length !== 0) {
          logger.info(`User ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
          return responseData.success(
            res,
            result,
            `User ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`
          );
        } else {
          logger.error(`User ${messageConstants.LIST_NOT_FOUND}`);
          return responseData.success(
            res,
            [],
            `User ${messageConstants.LIST_NOT_FOUND}`
          );
        }
      })
      .catch((err) => {
        logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
        return responseData.fail(
          res,
          `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`,
          500
        );
      });
  });
};

 
const forgotPasswordLink = async (res, user) => {
  const userId = user._id;
  const userToken = user["token"];
  const link = `${process.env.BASE_URL}/password-reset?id=${userId}&token=${userToken}`;
  const mailContent = {
    name: user.name,
    email: user.email,
    link: link,
  };
  await mail.sendMailtoUser(
    mailTemplateConstants.FORGOT_PASS_TEMPLATE,
    user.email,
    mailSubjectConstants.FORGOT_PASS_SUBJECT,
    res,
    mailContent
  );
  return responseData.success(
    res,
    {},
    messageConstants.EMAIL_SENT_FORGOT_PASSWORD
  );
};

module.exports = {
  getUserList,
  forgotPassword,
  changePassword,
  resetPassword,
};
