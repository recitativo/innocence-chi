/**
 * simpleAuthServer plugin
 * 
 * This plugin authenticates only http request by token included in request query string.
 */

const url = require("url");
const uuid = require("uuid");

const key = "simpleAuthServerKey";

module.exports = {
  init: () => {
    console.log("Initialize simpleAuthServer plugin");
    // noop
  },
  onHttp: (req, res) => {
    // Return promise. To accept request, resolve it.
    // To reject request, reject it.
    var promise = new Promise((resolve, reject) => {
      var saskey = req.query["saskey"];
      console.log(`saskey is ${saskey}`);
      // check saskey
      if (saskey === key) {
        resolve();
      } else {
        reject("simpleAuthServerKey is not correct.");
      }
    });
    return promise;
  }
};