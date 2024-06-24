const urlConstants = require('./url');
const responseData = require('./responses');
const messageConstants = require('./messages');
const { mailSubjectConstants, mailTemplateConstants } = require('./mail');
const { userType, ...enums } = require('./enum');

module.exports = {
    urlConstants,
    responseData,
    messageConstants,
    userType,
    mailSubjectConstants,
    mailTemplateConstants,
    ...enums
}