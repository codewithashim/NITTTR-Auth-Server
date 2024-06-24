// ====== auth service
const uuid = require("uuid");
const {
  responseData,
  messageConstants,
  mailSubjectConstants,
  mailTemplateConstants,
} = require("../../constants");
const { cryptoGraphy, jsonWebToken } = require("../../middleware");
const UserSchema = require("../../models/users");
const { logger, mail } = require("../../utils");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const signUp = async (body, res) => {
  return new Promise(async () => {
    body["password"] = cryptoGraphy.encrypt(body.password);
    const email_verification_token = uuid.v4().replace(/\-/g, "");
    const userSchema = new UserSchema({ ...body, email_verification_token });
    await userSchema
      .save()
      .then(async (result) => {
        logger.info(`${messageConstants.USER_REGISTERED}`);
        const userId = result?._id;
        const name = result?.name;
        const link = `${process.env.BASE_URL}/verify-email?id=${userId}&token=${email_verification_token}`;
        const mailContent = {
          name,
          email: result.email,
          link: link,
        };
        await mail.sendMailtoUser(
          mailTemplateConstants.VERIFY_EMAIL_TEMPLATE,
          result.email,
          mailSubjectConstants.VERIFY_EMAIL_SUBJECT,
          res,
          mailContent
        );
        return responseData.success(
          res,
          {
            id: result._id,
            email: result.email,
            role: result.role,
            name: result.name,
            number: result.number,
          },
          messageConstants.USER_REGISTERED
        );
      })
      .catch((err) => {
        if (err.code === 11000) {
          logger.error(
            `${messageConstants.USER_ALREADY_EXIST}. Plese use another email address`
          );
          return responseData.fail(
            res,
            `${messageConstants.USER_ALREADY_EXIST}. Plese use another email address`,
            403
          );
        } else {
          logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
          return responseData.fail(
            res,
            `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`,
            500
          );
        }
      });
  });
};

const signIn = async (body, res) => {
  return new Promise(async () => {
    if (body.provider && body.provider === "google") {
      // Handle Google OAuth login
      try {
        const googleUser = await verifyGoogleToken(body.token);
        if (googleUser) {
          let user = await UserSchema.findOne({
            email: googleUser.email,
            'social_logins.provider': 'google',
            'social_logins.id': googleUser.sub
          });

          if (!user) {
            // User not found with Google credentials, register them
            user = new User({
              name: googleUser.name,
              email: googleUser.email,
              social_logins: [{ provider: 'google', id: googleUser.sub }],
              role: "USER",
              number: googleUser.phone,
              is_email_verified: true,
            });
            await user.save();
          }

          // Generate JWT token or session for the user
          const token = await jsonWebToken.createToken(user);

          // Prepare response
          const responsePayload = {
            id: user._id,
            token,
            email: user.email,
            role: user.role,
            name: user.name,
            number: user.number,
          };

          logger.info(`User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`);
          return responseData.success(
            res,
            responsePayload,
            `User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`
          );
        } else {
          // Google OAuth token verification failed
          logger.error('Google OAuth token verification failed');
          return responseData.fail(res, 'Google OAuth token verification failed', 403);
        }
      } catch (err) {
        logger.error(`Google OAuth sign-in error: ${err}`);
        return responseData.fail(res, `Google OAuth sign-in error: ${err}`, 500);
      }
    } else {
      // Handle regular email/password login as before
      body["password"] = cryptoGraphy.encrypt(body.password);
      const user = await UserSchema.findOne({ email: body.email });

      if (user) {
        if (!user.is_email_verified) {
          logger.error(messageConstants.USER_NOT_VERIFIED);
          return responseData.fail(res, messageConstants.USER_NOT_VERIFIED, 405);
        }

        if (user.password === body.password) {
          const token = await jsonWebToken.createToken(user);
          logger.info(`User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`);

          // Include 'profile_image' in the response
          const responsePayload = {
            id: user._id,
            token,
            email: user.email,
            role: user.role,
            name: user.name,
            number: user.number,
          };

          return responseData.success(
            res,
            responsePayload,
            `User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`
          );
        } else {
          logger.error(messageConstants.EMAIL_PASS_INCORRECT);
          return responseData.fail(res, messageConstants.EMAIL_PASS_INCORRECT, 403);
        }
      } else {
        logger.error(messageConstants.EMAIL_NOT_FOUND);
        return responseData.fail(res, messageConstants.EMAIL_NOT_FOUND, 403);
      }
    }
  });
};

 
const verifyGoogleToken = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload;
};


// const signIn = async (body, res) => {
//   return new Promise(async () => {
//     body["password"] = cryptoGraphy.encrypt(body.password);
//     const user = await UserSchema.findOne({
//       email: body.email,
//     });

//     if (user) {
//       if (!user.is_email_verified) {
//         logger.error(messageConstants.USER_NOT_VERIFIED);
//         return responseData.fail(res, messageConstants.USER_NOT_VERIFIED, 405);
//       }

//       if (user.password === body.password) {
//         const token = await jsonWebToken.createToken(user);
//         logger.info(`User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`);

//         // Include 'profile_image' in the response
//         const responsePayload = {
//           id: user._id,
//           token,
//           email: user.email,
//           role: user.role,
//           name: user.name,
//           number: user.number,
//         };

//         return responseData.success(
//           res,
//           responsePayload,
//           `User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`
//         );
//       } else {
//         logger.error(messageConstants.EMAIL_PASS_INCORRECT);
//         return responseData.fail(
//           res,
//           messageConstants.EMAIL_PASS_INCORRECT,
//           403
//         );
//       }
//     } else {
//       logger.error(messageConstants.EMAIL_NOT_FOUND);
//       return responseData.fail(res, messageConstants.EMAIL_NOT_FOUND, 403);
//     }
//   }).catch((err) => {
//     logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
//     return responseData.fail(
//       res,
//       `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`,
//       500
//     );
//   });
// };

const verifyEmail = async (req, res) => {
  return new Promise(async () => {
    await UserSchema.findOne({
      _id: new ObjectId(req?.body?.user_id),
    })
      .then(async (result) => {
        let userData = result;
        if (result) {
          if (result?.is_email_verified === true) {
            logger.info(
              `${messageConstants.EMAIL_ALREADY_VERIFIED} for ${userData.email}`
            );
            return responseData.success(
              res,
              {},
              messageConstants.EMAIL_ALREADY_VERIFIED
            );
          } else {
            await UserSchema.updateOne(
              {
                _id: new ObjectId(result._id),
                email_verification_token: req?.body?.token,
              },
              {
                is_email_verified: true,
              },
              {
                new: true,
              }
            )
              .then(async (result) => {
                if (result?.modifiedCount !== 0) {
                  const mailContent = {
                    name: userData.firstName,
                  };
                  await mail.sendMailtoUser(
                    mailTemplateConstants.WELCOME_TEMPLATE,
                    userData.email,
                    mailSubjectConstants.WELCOME_TEMPLATE,
                    res,
                    mailContent
                  );
                  logger.info(
                    `${messageConstants.EMAIL_VERIFIED} for ${userData.email}`
                  );
                  return responseData.success(
                    res,
                    {},
                    messageConstants.WELCOME_TEMPLATE
                  );
                } else if (result?.matchedCount !== 0) {
                  logger.info("Email already verified");
                  return responseData.success(
                    res,
                    result,
                    "Email already verified"
                  );
                } else {
                  // Token is invalid, returning success response with 401 status code
                  logger.info("Token is invalid");
                  res
                    .status(401)
                    .json({ success: false, message: "Token is invalid" });
                }
              })
              .catch((err) => {
                logger.error(
                  `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`
                );
                return responseData.fail(
                  res,
                  `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`,
                  500
                );
              });
          }
        } else {
          logger.error(messageConstants.USER_NOT_FOUND);
          return responseData.fail(res, messageConstants.USER_NOT_FOUND, 404);
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

const resendEmailVerification = async (req, res) => {
  return new Promise(async () => {
    await UserSchema.findOneAndUpdate(
      { email: req?.body?.email },
      { $set: { email_verification_token: null } }
    );

    const temporaryEmailVerificationToken = uuid.v4().replace(/\-/g, "");
    await UserSchema.findOneAndUpdate(
      { email: req?.body?.email },
      { $set: { email_verification_token: temporaryEmailVerificationToken } }, // Set the new token
      { new: true }
    )
      .then(async (result) => {
        if (result && result?.is_email_verified === true) {
          logger.info(
            `${messageConstants.EMAIL_ALREADY_VERIFIED} for ${result.email}`
          );
          return responseData.success(
            res,
            {},
            messageConstants.EMAIL_ALREADY_VERIFIED
          );
        } else {
          const userId = result._id;
          const name = `${result.firstName} ${result.lastName}`;
          const link = `${process.env.BASE_URL}/verify-email?id=${userId}&token=${temporaryEmailVerificationToken}`;
          const mailContent = {
            name,
            email: result.email,
            link: link,
          };
          await mail.sendMailtoUser(
            mailTemplateConstants.VERIFY_EMAIL_TEMPLATE,
            result.email,
            mailSubjectConstants.VERIFY_EMAIL_SUBJECT,
            res,
            mailContent
          );
          logger.info(
            `${messageConstants.EMAIL_RESENT_FOR_VERIFICATION} for ${result.email}`
          );
          return responseData.success(
            res,
            [],
            `${messageConstants.EMAIL_RESENT_FOR_VERIFICATION} for ${result.email}`
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
    if (req?.body?.ref == "send_verification_code") {
      await UserSchema.findOne({ email: req.body.email })
        .then(async (result) => {
          if (result) {
            const verificationCode = generateVerificationCode();
            result["verification_code"] = verificationCode;
            await result
              .save()
              .then(async (user) => {
                await verificationCodeByEmail(res, user);
              })
              .catch((err) => {
                logger.error(
                  `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`
                );
                return responseData.fail(
                  res,
                  `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`,
                  500
                );
              });
          } else {
            logger.error(`User not found with this ${req?.body?.email}`);
            return responseData.fail(
              res,
              `User not found with this ${req?.body?.email}`,
              404
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
    } else if (req?.body?.ref == "verify_otp") {
      await UserSchema.findOne({ email: req.body.email })
        .then(async (result) => {
          if (result) {
            if (result["verification_code"] == req.body.otp) {
              result["verified_code"] = true;
              await result
                .save()
                .then(async (user) => {
                  logger.info("Otp verified successfully");
                  return responseData.success(
                    res,
                    {},
                    "Otp verified successfully"
                  );
                })
                .catch((err) => {
                  logger.error(
                    `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`
                  );
                  return responseData.fail(
                    res,
                    `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`,
                    500
                  );
                });
            } else {
              logger.error("Incorrect OTP");
              return responseData.fail(res, "Incorrect OTP", 400);
            }
          } else {
            logger.error(`User not found with this ${req?.body?.email}`);
            return responseData.fail(
              res,
              `User not found with this ${req?.body?.email}`,
              404
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
    } else if (req?.body?.ref == "change_password") {
      req.body["new_password"] = cryptoGraphy.encrypt(req.body.new_password);
      await UserSchema.findOneAndUpdate(
        { email: req?.body?.email },
        { password: req?.body["new_password"] }
      )
        .then(async (result) => {
          if (result) {
            if (result?.verified_code) {
              const mailContent = {
                name: result?.name,
                email: result?.email,
              };
              await mail.sendMailtoUser(
                mailTemplateConstants.FORGOTTED_PASS_TEMPLATE,
                result?.email,
                mailSubjectConstants.FORGOTTED_PASS_SUBJECT,
                res,
                mailContent
              );
              logger.info(
                `${messageConstants.PASSWORD_FORGOT} for ${result?.email}`
              );
              return responseData.success(
                res,
                {},
                messageConstants.PASSWORD_FORGOT
              );
            } else {
              logger.error("Please verify OTP first");
              return responseData.fail(res, "Please verify OTP first", 403);
            }
          } else {
            logger.error(`User not found with this ${req?.body?.email}`);
            return responseData.fail(
              res,
              `User not found with this ${req?.body?.email}`,
              404
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
    } else {
      logger.error("Pass correct referance to forgot password");
      return responseData.fail(
        res,
        "Pass correct referance to forgot password",
        500
      );
    }
  });
};

const generateVerificationCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
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

const verificationCodeByEmail = async (res, user) => {
  const mailContent = {
    name: user?.name,
    email: user?.email,
    verification_code: user.verification_code,
  };
  await mail.sendMailtoUser(
    mailTemplateConstants.FORGOT_PASS_TEMPLATE,
    user?.email,
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
  signUp,
  signIn,
  verifyEmail,
  getUserList,
  forgotPassword,
  changePassword,
  resetPassword,
  resendEmailVerification,
};
