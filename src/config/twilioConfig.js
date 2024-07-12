const twilio = require('twilio');
const accountSid = 'ACebbae20bae31f9cf9cafba0db6ca40bc'; 
const authToken = 'f9fbcbd913272ed7790b00620e53dc62';

const client = new twilio(accountSid, authToken);

module.exports = client;