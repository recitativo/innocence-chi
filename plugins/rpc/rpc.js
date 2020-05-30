// Copyright 2018 recitativo
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
  onMessage: (socket, uri, message) => {
    // TODO: send message to own queue
    // TODO: after processing on RPC, sendback message to "innocchi" exchange on RabbitMQ.
    return null; // null: DO NOT SEND VIA innocence-chi IMMEDIATELY
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