const UserSchema = require('../../models/users');
const { logger } = require('../../utils');
const { responseData, messageConstants } = require('../../constants');

const getUserData = async (req, res) => {
    return new Promise(async (resolve, reject) => {
        await UserSchema.find({ _id: req.userId }).then(async (result) => {
            if (result.length !== 0) {
                logger.info(`User ${result[0]['firstName']} fetched successfully`);
                return resolve(result[0]);
            } else {
                logger.error(messageConstants.TOKEN_EXPIRED);
                res.status(401).send(responseData.unauthorized);
            }
        }).catch((err) => {
            logger.error(`${messageConstants.USER_NOT_FOUND} ${err}`);
            return reject(messageConstants.USER_NOT_FOUND);
        })
    })
}

module.exports = {
    getUserData
}