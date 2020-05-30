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