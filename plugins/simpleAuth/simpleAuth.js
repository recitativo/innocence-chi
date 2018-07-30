/**
 * simpleAuth Subprotocol
 * 
 * This subprotocol plugin authenticate user by token included in request cookie.
 */

const url = require("url");
const uuid = require("uuid");
const request = require("sync-request");

module.exports = {
  init: () => {
    console.log("Initialize simpleAuth plugin");
    // noop
  },
  handleProtocol: (req) => {
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
          try {
            response = request("GET", "https://localhost:8000/example/" + token, {
              timeout: 500,
              rejectUnauthorized: false
            });
            console.log(response);
            uri = url.format({protocol: "simpleAuth", host: "simple.auth", pathname: "/", auth: uuid.v4()});
          } catch(e) {
            console.log(e);
          }
          return false;
        }
      });
    }
    return uri;
  },
  onMessage: (socket, message) => {
    // TODO: check token expire
    return 2; // scope 2: PATH
  }
};