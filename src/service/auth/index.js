// ====== auth service
const uuid = require("uuid");
const axios = require("axios");
const {
  responseData,
  messageConstants,
  mailSubjectConstants,
  mailTemplateConstants,
} = require("../../constants");
const { cryptoGraphy, jsonWebToken } = require("../../middleware");
const UserSchema = require("../../models/users");
const { logger, mail, otpService } = require("../../utils");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const jwt = require("jsonwebtoken");

function generateTimestampAndTraceId() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = now.getUTCDate().toString().padStart(2, "0");
  const hours = now.getUTCHours().toString().padStart(2, "0");
  const minutes = now.getUTCMinutes().toString().padStart(2, "0");
  const seconds = now.getUTCSeconds().toString().padStart(2, "0");

  const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  const traceId = `${timestamp}${suffix}`;

  return {
    bdTimestamp: timestamp,
    bdTraceid: traceId,
  };
}

const { bdTimestamp, bdTraceid } = generateTimestampAndTraceId();

function createToken(payload, secretKey) {
  const options = {
    algorithm: "HS256",
    header: {
      clientid: process.env.BILLDESK_CLIENT_ID,
    },
  };
  return jwt.sign(payload, secretKey, options);
}

function decodeJWT(token) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) throw new Error("Invalid token: missing payload.");
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

async function createOrder(token, timestamp, traceId) {
  try {
    const response = await axios.post(
      process.env.BILLDESK_CREATE_ORDER_URL,
      token,
      {
        headers: {
          "content-type": "application/jose",
          "bd-timestamp": timestamp,
          accept: "application/jose",
          "bd-traceid": traceId,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("Error data:", error.response);
    } else if (error.request) {
      console.error("Error request:", error.request);
    } else {
      console.error("Error message:", error.message);
    }
    throw error;
  }
}

const createBillDeskOrder = async (orderData) => {
  try {
    const payload = {
      mercid: orderData.mercid,
      orderid: orderData.orderid,
      amount: orderData.amount.toString(),
      order_date: orderData.order_date,
      currency: orderData.currency,
      ru: orderData.ru,
      additional_info: orderData.additional_info,
      itemcode: orderData.itemcode,
      device: {
        init_channel: orderData.device.init_channel,
        ip: orderData.device.ip,
        user_agent: orderData.device.user_agent,
        accept_header: orderData.device.accept_header,
        fingerprintid: orderData.device.fingerprintid,
        browser_tz: orderData.device.browser_tz,
        browser_color_depth: orderData.device.browser_color_depth,
        browser_java_enabled: orderData.device.browser_java_enabled,
        browser_screen_height: orderData.device.browser_screen_height,
        browser_screen_width: orderData.device.browser_screen_width,
        browser_language: orderData.device.browser_language,
        browser_javascript_enabled: orderData.device.browser_javascript_enabled,
      },
    };

    const token = createToken(payload, process.env.BILLDESK_SECRET_KEY);
    const traceId = bdTraceid;
    const timestamp = bdTimestamp;
    const orderResponse = await createOrder(token, timestamp, traceId);
    return decodeJWT(orderResponse);
  } catch (error) {
    console.error("BillDesk order error:", error);
    throw error;
  }
};

const sendOtp = async (body) => {
  try {
    const otp = await otpService.saveOtpToDatabase(body.number);
    // await otpService.sendOtpToUser(body.number, otp);
    return { success: true, msg: "OTP sent successfully", body: {} };
  } catch (err) {
    const errorMsg = `${messageConstants.INTERNAL_SERVER_ERROR}. ${err.message}`;
    console.error(errorMsg);
    return { success: false, msg: errorMsg, status: 500 };
  }
};

const verifyOtp = async (body) => {
  try {
    const { number, otp } = body;
    const otpVerificationResponse = await otpService.verifyOtpFromDatabase(
      number,
      otp
    );

    if (otpVerificationResponse.verified) {
      return { success: true, msg: "OTP verified successfully", body: {} };
    } else {
      return { success: false, msg: otpVerificationResponse.msg, status: 400 };
    }
  } catch (err) {
    const errorMsg = `${messageConstants.INTERNAL_SERVER_ERROR}. ${err.message}`;
    console.error(errorMsg);
    return { success: false, msg: errorMsg, status: 500 };
  }
};

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
      try {
        const googleUser = await fetchGoogleUserInfo(body.token);
        if (googleUser) {
          let user = await UserSchema.findOne({
            email: googleUser.email,
            "social_logins.provider": "google",
            "social_logins.id": googleUser.sub,
          });

          if (!user) {
            const newUser = {
              name: googleUser.name,
              email: googleUser.email,
              social_logins: [{ provider: "google", id: googleUser.sub }],
              role: "USER",
              is_email_verified: true,
            };

            if (googleUser.phone && googleUser.phone.trim() !== "") {
              newUser.number = googleUser.phone;
            } else {
              newUser.number = undefined;
            }

            user = new UserSchema(newUser);
            await user.save();
          }

          const token = await jsonWebToken.createToken(user);

          const responsePayload = {
            isVerified: true,
            user: {
              id: user._id,
              email: user.email,
              role: user.role,
              name: user.name,
              number: user.number || undefined,
            },
            token,
          };

          logger.info(`User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`);
          return responseData.success(
            res,
            responsePayload,
            `User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`
          );
        } else {
          logger.error("Google OAuth token verification failed");
          return responseData.fail(
            res,
            "Google OAuth token verification failed",
            403
          );
        }
      } catch (err) {
        logger.error(`Google OAuth sign-in error: ${err}`);
        return responseData.fail(
          res,
          `Google OAuth sign-in error: ${err}`,
          500
        );
      }
    } else {
      body["password"] = cryptoGraphy.encrypt(body.password);
      const user = await UserSchema.findOne({ email: body.email });

      if (user) {
        if (!user.is_email_verified) {
          logger.error(messageConstants.USER_NOT_VERIFIED);
          return responseData.fail(
            res,
            messageConstants.USER_NOT_VERIFIED,
            405
          );
        }

        if (user.password === body.password) {
          const token = await jsonWebToken.createToken(user);
          logger.info(`User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`);
          const responsePayload = {
            id: user._id,
            token,
            email: user.email,
            role: user.role,
            name: user.name,
            number: user.number || undefined,
          };

          return responseData.success(
            res,
            responsePayload,
            `User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`
          );
        } else {
          logger.error(messageConstants.EMAIL_PASS_INCORRECT);
          return responseData.fail(
            res,
            messageConstants.EMAIL_PASS_INCORRECT,
            403
          );
        }
      } else {
        logger.error(messageConstants.EMAIL_NOT_FOUND);
        return responseData.fail(res, messageConstants.EMAIL_NOT_FOUND, 403);
      }
    }
  });
};

const fetchGoogleUserInfo = async (token) => {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (err) {
    logger.error("Failed to fetch Google user info", err);
    throw new Error("Failed to fetch Google user info");
  }
};

const verifyPhoneNumber = async (email) => {
  try {
    const user = await UserSchema.findOne({ email });
    return user;
  } catch (error) {
    console.error(`Error finding user by email: ${error}`);
    throw new Error("Error finding user by email");
  }
};

const verifyUserExistence = async (email, number) => {
  try {
    const user = await UserSchema.findOne({ $or: [{ email }, { number }] });
    return user;
  } catch (error) {
    console.error(`Error finding user by email or number: ${error}`);
    throw new Error("Error finding user by email or number");
  }
};

const updateUserPhoneNumber = async (email, number) => {
  try {
    const user = await UserSchema.findOneAndUpdate(
      { email },
      { $set: { number: number } },
      { new: true }
    );
    return user;
  } catch (err) {
    console.error(`Error updating user phone number: ${err.message}`);
    throw new Error("Error updating user phone number");
  }
};

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
  sendOtp,
  verifyOtp,
  verifyPhoneNumber,
  verifyUserExistence,
  updateUserPhoneNumber,
  createBillDeskOrder,
  createOrder,
};
