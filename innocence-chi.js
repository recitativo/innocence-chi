const fs = require("fs");
const path = require('path');
const https = require("https")
const express = require("express")
const wsServer = require("ws").Server;
const url = require("url");

var PORT = 8000;
var PING_INTERVAL = 10000;

// ssl settings
const opts = {
  cert: fs.readFileSync("./certs/server.crt").toString(),
  key: fs.readFileSync("./certs/server.key").toString(),
};

// test app settings
const app = express();
app.get("/example/", function (req, res) {
  res.sendFile(__dirname + "/example/ws.html");
});

// initialize a simple http server
const sslServer = https.createServer(opts, app);

// initialize the WebSocket server instance
const wssv = new wsServer({ "server": sslServer, "handleProtocols": handleProtocols});

// load plugins
// plugin should be deployed in directry named with subprotocol name.
// and it should have main.js or [subprotocol].js.
const plugins = {};
const pluginsDir = path.join(__dirname, 'plugins');
fs.readdirSync(pluginsDir).forEach(dir => {
  const pluginDir = path.join(pluginsDir, dir);
  if (fs.statSync(pluginDir).isDirectory()) {
    fs.readdirSync(pluginDir).forEach(file => {
      if (file !== "main.js" && file !== dir + ".js") {
        return;
      }
      plugins[file.slice(0, -3)] = require(path.join(pluginDir, file));
      console.log(`subprotocol plugin ${dir} is loaded`);
    });
  }
});

// handle subprotocols
function handleProtocols(protocols, req) {
  console.info(`subprotocols: ${protocols.join(", ")}`);
  // accepted subprotocol. if this is set as false, all subprotocol does not accept.
  // only one subprotocol can accept the request.
  var accepted = false;
  // processing subprotocols in order of the list
  protocols.some(protocol => {
    console.info(`processing subprotocol: ${protocol}`);

    if (!plugins[protocol]) {
      console.info(`subprotocol plugin not found: ${protocol}`);
      return;
    }
    // call handleProtocol implemented in subprotocol plugin
    // if handler accept the request, it will returns URI for the client
    // if handler does not accept, it will returns null.
    var uri = plugins[protocol].handleProtocol(req);

    if (uri) {
      accepted = protocol;
      req.icSubprotocolUri = uri;
      console.info(`accepted subprotocol: ${protocol} with URI: ${uri}`);
      return true;
    }
    console.info(`rejected subprotocol: ${protocol}`);
  });
  // return accepted subprotocol
  return accepted;
}

// connection store
// {"[subprotocol]": {"[domain]": {"[path]": {"[user]": socket}}}}
var connections = {};

// connection succeeded
wssv.on("connection", (socket, req) => {
  // get icSubprotocolUri from req
  var uri = url.parse(req.icSubprotocolUri);
  socket["icSubprotocolUri"] = uri;
  console.log(`connected: ${uri.href}`);

  // store socket with URI
  // {"[subprotocol]": {"[domain]": {"[path]": {"[user]": socket}}}}
  if (!connections[uri.protocol]) {
    connections[uri.protocol] = {};
    connections[uri.protocol][uri.host] = {};
    connections[uri.protocol][uri.host][uri.pathname] = {};
  } else if (!connections[uri.protocol][uri.host]) {
    connections[uri.protocol][uri.host] = {};
    connections[uri.protocol][uri.host][uri.pathname] = {};
  } else if (!connections[uri.protocol][uri.host][uri.pathname]) {
    connections[uri.protocol][uri.host][uri.pathname] = {};
  }
  connections[uri.protocol][uri.host][uri.pathname][uri.auth] = socket;

  // set the socket alive
  socket.isAlive = true;
  // if client returns pong, set the socket alive
  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("message", (message) => {
    var scope = null; // SCHEMA, DOMAIN, PATH (default), USER
    // set scope
    // If subprotocol plugin has onMessage, call it.
    // And it should return scope to dispatch.
    if (plugins[socket.protocol].onMessage) {
      scope = plugins[socket.protocol].onMessage(socket, message);
    }

    // TODO: if AMQP backend enabled, send to it.
      // TODO: pack message with URI and scope
      // TODO: send message to AMQP broker

    // otherwise dispatch message directly.
    dispatchMessage(uri, scope, message)
  });

  socket.on("disconnect", () => {
    console.log(`disconnected: ${uri.href}`);
  });

  socket.on("close", () => {
    console.log(`closed: ${uri.href}`);
  });

  socket.on("error", (err) => {
    console.log(`error on ${uri.href}: ${err}`);
  });
});

function dispatchMessage(uri, scope, message) {
  console.info(`received from ${uri.href}: ${message}`);

  // dispatch message to clients has same scope.
  // scope: SCHEMA, DOMAIN, PATH (default), USER
  var sockets = [];
  if (scope === "SCHEMA") {
    var domains = connections[uri.protocol];
    Object.keys(domains).forEach(function(domain) {
      var paths = domains[domain];
      Object.keys(paths).forEach(function(path) {
        var users = paths[path];
        Object.keys(users).forEach(function(user) {
          if (validateSocket(users[user])) {
            sockets.push(users[user]);
          }
        });
      });
    });
  }
  else if (scope === "DOMAIN") {
    var paths = connections[uri.protocol][uri.host];
    Object.keys(paths).forEach(function(path) {
      var users = paths[path];
      Object.keys(users).forEach(function(user) {
        if (validateSocket(users[user])) {
          sockets.push(users[user]);
        }
      });
    });
  }
  else if (scope === "USER") {
    sockets = [connections[uri.protocol][uri.host][uri.pathname][uri.auth]];
  }
  else { // (scope === "PATH" || !scope), as default
    var users = connections[uri.protocol][uri.host][uri.pathname];
    Object.keys(users).forEach(function(user) {
      if (validateSocket(users[user])) {
        sockets.push(users[user]);
      }
    });
  }

  sockets.forEach((socket) => {
    // simply broadcast message within the scope including sender
    socket.send(message);
  });
}

// send ping to client in each specified interval
setInterval(() => {
  wssv.clients.forEach((socket) => {
      // terminate socket if not alive
      if (!socket.isAlive) return cleanupSocket(socket);
      // send ping to client
      socket.isAlive = false;
      socket.ping(null, false, true);
  });
}, PING_INTERVAL);

// check readyState, if it is not 1, remove the socket from connections.
function validateSocket(socket) {
  if (socket.readyState !== 1) {
    var uri = socket.icSubprotocolUri;
    delete connections[uri.protocol][uri.host][uri.pathname][uri.auth];
    return false;
  } else {
    return true;
  }
}

// cleanup socket not alive
function cleanupSocket(socket) {
  // remove connection URI
  var uri = socket.icSubprotocolUri;
  delete connections[uri.protocol][uri.host][uri.pathname][uri.auth];

  // terminate the socket
  socket.terminate();
}

// TODO: AMQP connection
  // TODO: receive message from AMQP broker
  // TODO: unpack message with URI and scope to call dispatchMessage(socket, scope, message)


// start server
sslServer.listen(process.env.PORT || PORT, () => {
  console.log(`Server started on port ${sslServer.address().port}`);
});
