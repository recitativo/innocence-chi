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