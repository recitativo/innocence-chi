/**
 * RPC Subprotocol
 * 
 * This subprotocol plugin send message to own queue for remote process.
 * To stop sending message via "innocence-chi" immediately, return null by onMessage.
 * Message will be processed and sent back to "innocchi" exchange by remote process,
 * then message will be sent via innocence-chi dispacher.
 */

const url = require("url");
const uuid = require('uuid');

module.exports = {
  init: () => {
    console.log("Initialize RPC plugin");
    // TODO: connect own queue
  },
  handleProtocol: (req) => {
    // To accept the request, return promise resolved with URI.
    return Promise.resolve(
      url.format({
        protocol: "rpc",
        host: "rpc",
        pathname: "/",
        auth: uuid.v4()
      })
    );
  },
  onMessage: (socket, message) => {
    // TODO: send message to own queue
    // TODO: after processing on RPC, sendback message to "innocchi" exchange on RabbitMQ.
    return null; // null: DO NOT SEND VIA innocence-chi IMMEDIATELY
  }
};