const messageConstants = require("./messages");

const responseData = {
    success: function (res, body, msg) {
        res?.status(200).json({
            success: 1,
            code: 200,
            msg: msg,
            body: body
        });
        return false;
    },
    fail: function (res, msg, status = 500, body = {}) {
        res?.status(status).json({
            success: 0,
            code: status,
            msg: msg,
            body: body
        });
        return false;
    },
    unauthorized: {
        success: 0,
        code: 401,
        msg: messageConstants.UNAUTHORIZED
    },
    tokenRequired: {
        success: 0,
        code: 400,
        msg: messageConstants.PROVIDE_TOKEN
    }

}

module.exports = responseData;