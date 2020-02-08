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

const saskey = "simpleAuthServerKey";

function authorize(token){
  return request({
    uri: `https://localhost/simpleAuthServer/${token}?saskey=${saskey}`,
    json: true,
    rejectUnauthorized: false
  });
}

module.exports = {
  init: () => {
    console.log("Initialize simpleAuth plugin");
    // noop
  },
  onHttp: (req, res) => {
    // Return promise. To accept request, resolve it.
    // To reject request, reject it.
    var promise = new Promise((resolve, reject) => {
      var token = req.query["token"];
      // check token with simpleAuthServer and set URI
      authorize(token).then(response => {
        console.log(response);
        resolve();
      }).catch(e => {
        reject(e.message);
      });
    });
    return promise;
  },
  handleProtocol: (req) => {
    // To accept request, return promise and resolve it with URI.
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
            // check token via simpleAuthServer and set URI
            authorize(token).then(response => {
              console.log(response);
              uri = url.format({protocol: "simpleAuth", host: "simple.auth", pathname: "/", auth: uuid.v4()});
              resolve(uri);
            }).catch(e => {
              console.log(e);
              reject(e.message);
            });
          }
        });
        if (token === null) {
          reject("no token");
        }
      } else {
        reject("no credentials");
      }
    });
    return promise;
  },
  onMessage: (socket, uri, message) => {
    // TODO: check token expire
    return 2; // scope 2: PATH
  },
  onDisconnect: (socket, uri) => {
    // TODO
  },
  onClose: (socket, uri) => {
    // TODO
  },
  onError: (socket, uri) => {
    // TODO
  }
};