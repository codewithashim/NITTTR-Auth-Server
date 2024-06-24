const express = require("express");
const router = express.Router();

const routes = [`auth`];

routes.forEach((route) => {
  require(`./${route}`)(router);
});

module.exports = router;
