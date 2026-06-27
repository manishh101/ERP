const { createApp } = require("../server/dist/app.js");

const app = createApp();

module.exports = app;
module.exports.config = {
  maxDuration: 60,
};
