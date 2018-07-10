/**
 * Broadcast Subprotocol
 * 
 * This subprotocol plugin broadcasts all messages to all client which uses "broadcast" subprotocol.
 */

const url = require("url");
const uuid = require('uuid');

module.exports = {
  handleProtocol: (req) => {
    return url.format({protocol: "broadcast", host: "broadcast", pathname: "/", auth: uuid.v4()});
  },
  onMessage: (socket, message) => {
    return "SCHEMA";
  }
};