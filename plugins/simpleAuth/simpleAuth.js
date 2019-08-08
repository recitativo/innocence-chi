/**
 * simpleAuth Subprotocol
 * 
 * This subprotocol plugin authenticate user by token included in request cookie.
 * If plugin returns Promise, should return `resolve(uri)` to accept the request.
 * If plugin can not accept the request, should return `resolve(null)` to handle next protocol.
 * If plugin returns Promise with `reject()`, subsequent protocol will not be handled.
 */

const url = require("url");
const uuid = require("uuid");
const request = require("request-promise-native");

module.exports = {
  init: () => {
    console.log("Initialize simpleAuth plugin");
    // noop
  },
  handleProtocol: (req) => {
    // To accept the request, return promise resolved with URI.
    var promise = new Promise((resolve, reject) => {
      var uri, token;
      var cookies = req.headers.cookie;
      console.info(`Cookies: ${cookies}`);
      if (cookies) {
        cookies = cookies.split(" ");
        cookies.forEach(cookie => {
          console.info(`Cookie: ${cookie}`);
          cookie = cookie.split(";");
          cookie = cookie[0].split("=");
          if (cookie[0] === "simpleAuthToken") {
            token = cookie[1];
            console.debug(`simpleAuthToken: ${token}`);
            // check token via SimpleAuth service and set URI
            request({
              uri: "https://localhost/example/" + token,
              json: true,
              rejectUnauthorized: false
            }).then(response => {
              console.log(response);
              uri = url.format({protocol: "simpleAuth", host: "simple.auth", pathname: "/", auth: uuid.v4()});
              resolve(uri);
            }).catch(e => {
              console.log(e);
              reject(e);
            });
          }
        });
      } else {
        reject("no credentials");
      }
    });
    return promise;
  },
  onMessage: (socket, message) => {
    // TODO: check token expire
    return 2; // scope 2: PATH
  }
};