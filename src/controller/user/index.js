const { messageConstants } = require('../../constants');
const authService = require('../../service/auth');
const { logger } = require('../../utils');
const { getUserData } = require('../../middleware');

const uploadImage = async (req, res) => {
    try {
        const response = await authService.uploadImage(req, res);
        logger.info(`${messageConstants.RESPONSE_FROM} uploadImage API`);
        res.send(response);
    } catch (err) {
        logger.error(`UploadImage ${messageConstants.API_FAILED} ${err}`);
        res.send(err);
    }
}

const getUserList = async (req, res) => {
    try {
        const userData = await getUserData(req, res);
        const response = await authService.getUserList(res, userData);
        logger.info(`${messageConstants.RESPONSE_FROM} getUserList API`, JSON.stringify(jsonData));
        res.send(response);
    } catch (err) {
        logger.error(`GetUserList ${messageConstants.API_FAILED} ${err}`);
        res.send(err);
    }
}

const getUserById = async (req, res) => {
    try {
        const userData = await getUserData(req, res);
        const response = await authService.getUserProfileById(req, userData,res);
        logger.info(`${messageConstants.RESPONSE_FROM} getUserById API`, JSON.stringify(response));
    } catch (error) {
        logger.error(`getUserById ${messageConstants.API_FAILED} ${error}`);
    }
}

const getOptionsList = async (req, res) => {
    try {
        const userData = await getUserData(req, res);
        const response = await authService.getOptionsList(req, userData, res);
        logger.info(`${messageConstants.RESPONSE_FROM} getOptionsList API`, JSON.stringify(response));
        res.send(response);
    } catch (err) {
        logger.error(`Get Options List ${messageConstants.API_FAILED} ${err}`);
        res.send(err);
    }
}

const resetPassword = async (req, res) => {
    try {
        const userData = await getUserData(req, res);
        const response = await authService.resetPassword(req.body, userData, res);
        logger.info(`${messageConstants.RESPONSE_FROM} resetPassword API`, JSON.stringify(response));
        res.send(response);
    } catch (err) {
        logger.error(`Reset Password ${messageConstants.API_FAILED}`, err);
        res.send(err);
    }
}

const forgotPassword = async (req, res, next) => {
    try {
        const response = await authService.forgotPassword(req, res, next);
        logger.info(`${messageConstants.RESPONSE_FROM} forgotPassword API`, JSON.stringify(response));
        res.send(response);
    } catch (err) {
        logger.error(`Forgot Password ${messageConstants.API_FAILED}`, err);
        res.send(err);
    }

}

const changePassword = async (req, res, next) => {
    try {
        const userData = await getUserData(req, res);
        const response = await authService.changePassword(req.body, userData, res, next);
        logger.info(`${messageConstants.RESPONSE_FROM} changePassword API`, JSON.stringify(response));
        res.send(response);
    } catch (err) {
        logger.error(`Change Password ${messageConstants.API_FAILED}`, err);
        res.send(err);
    }

}

module.exports = {
    uploadImage,
    getUserList,
    forgotPassword,
    changePassword,
    resetPassword,
    getOptionsList,
    getUserById
}