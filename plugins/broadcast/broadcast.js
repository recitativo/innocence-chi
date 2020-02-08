/**
 * Broadcast Subprotocol
 * 
 * This subprotocol plugin broadcasts all messages to all client which uses
 * "broadcast" subprotocol including sender.
 */

const url = require("url");
const uuid = require('uuid');

module.exports = {
  init: () => {
    // noop
  },
  handleProtocol: (req) => {
    // To accept the request, return promise resolved with URI.
    return Promise.resolve(
      url.format({
        protocol: "broadcast",
        host: "broadcast",
        pathname: "/",
        auth: uuid.v4()
      })
    );
  },
  onMessage: (socket, uri, message) => {
    return 0; // 0: "SCHEMA"
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