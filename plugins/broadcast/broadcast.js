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
    return url.format({protocol: "broadcast", host: "broadcast", pathname: "/", auth: uuid.v4()});
  },
  onMessage: (socket, message) => {
    return 0; // 0: "SCHEMA"
  }
};