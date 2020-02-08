const amqp = require("amqplib");
const express = require("express")
const fs = require("fs");
const https = require("https")
const path = require("path");
const url = require("url");
const wsServer = require("ws").Server;

const PORT = 443;
const PING_INTERVAL = 10000;
const AMQP = process.env.AMQP;
const SCOPE = ["SCHEMA", "DOMAIN", "PATH", "USER"];

// ssl settings
const opts = {
  cert: fs.readFileSync("./certs/server.crt").toString(),
  key: fs.readFileSync("./certs/server.key").toString(),
};

// load plugins
// plugin must be deployed in directory named with plugin name.
// and it must have main.js or [plugin].js.
const plugins = {};
const pluginsDir = path.join(__dirname, "plugins");
fs.readdirSync(pluginsDir).forEach(dir => {
  const pluginDir = path.join(pluginsDir, dir);
  if (fs.statSync(pluginDir).isDirectory()) {
    fs.readdirSync(pluginDir).forEach(file => {
      if (file !== "main.js" && file !== dir + ".js") {
        return;
      }
      var plugin = require(path.join(pluginDir, file));
      // initialize plugin
      if (plugin.init) plugin.init();
      // register loaded plugin
      plugins[dir] = plugin;
      console.log(`plugin ${dir} is loaded`);
    });
  }
});

// web apps
const app = express();
// webroot
const webroot = __dirname + "/webroot/"
// register pathes served by plugins
Object.keys(plugins).forEach(function(plugin) {
  app.get(`/${plugin}/*`, function (req, res) {
    if(plugins[plugin].onHttp){
      console.info(`validate ${req.path} with ${plugin} plugin`);
      plugins[plugin].onHttp(req, res).then(() => {
        console.info(`accepted by ${plugin} plugin`);
        serveStatic(req, res);
      }).catch(reason => {
        // request rejected by the subprotocol plugin.
        console.error(`rejected by ${plugin} plugin due to ${reason}`);
        handleError(req, res, 401);
      });
    }
  });
});
// others are served as pulbic
app.get("*", function (req, res) {
  serveStatic(req, res);
});

// handle error response
function handleError(req, res, status, err){
  if(err){
    console.error(`Error: ${err.message}`);
    if(err.code === "ENOENT"){
      status = 404;
    }else{
      status = 500;
    }
  }
  res.sendStatus(status);
  console.error(`${status}: ${res.statusMessage}: ${req.path}`);
}

// serve static files
function serveStatic(req, res) {
  console.info(`${req.path} on ${webroot} is requested.`);
  var reqPath = req.path;
  if (reqPath.endsWith("/")){
    reqPath += "index.html";
    console.error(`Request path changed to: ${reqPath}`);
  }
  fs.realpath(webroot + reqPath, function (err, resolvedPath) {
    if (err) {
      handleError(req, res, 0, err);
      return;
    }
    if (!resolvedPath.startsWith(webroot)) {
      handleError(req, res, 403);
      return;
    }
    fs.stat(webroot + reqPath, function (err, stats) {
      if (err) {
        handleError(req, res, err);
      } else {
        if (stats.isFile()) {
          console.info(`${resolvedPath} was sent.`);
          res.sendFile(webroot + reqPath);
        } else {
          handleError(req, res, 403);
        }
      }
    });
  });
}

// initialize http server
const sslServer = https.createServer(opts, app);

// initialize WebSocket server instance
const wssv = new wsServer({ "server": sslServer, "handleProtocols": handleProtocols});

// handle subprotocols in order of the list `protocols`
function handleProtocol (protocols, req, idx, resolve, reject) {
  var protocol = protocols[idx];
  if (!protocol) {
    reject("There is no more subprotocol should be handled.");
  } else if (!plugins[protocol]) {
    console.error(`plugin not found for ${protocol}`);
    handleProtocol(protocols, req, idx + 1, resolve, reject);
  } else if (!plugins[protocol].handleProtocol) {
    console.error(`plugin does not handle websocket protocol ${protocol}`);
    handleProtocol(protocols, req, idx + 1, resolve, reject);
  } else {
    console.info(`handle subprotocol: ${protocol}`);
    // call handleProtocol implemented in plugin
    // if plugin accept the request, it will returns promise resolved with URI for the request.
    // if plugin does not accept, it will returns promise rejected.
    plugins[protocol].handleProtocol(req).then(uri => {
      // request accepted by plugin.
      // set icSubprotocolUri to pass URI to "on connection" handler.
      req.icSubprotocolUri = uri;
      console.info(`accepted subprotocol: ${protocol} with URI: ${uri}`);
      resolve(protocol);
    }).catch(reason => {
      // request rejected by the subprotocol plugin.
      console.error(`rejected subprotocol: ${protocol}`);

      // handle subsequent protocol
      handleProtocol(protocols, req, idx + 1, resolve, reject);
    });
  }
}

// handle subprotocols
function handleProtocols(protocols, req) {
  console.info(`subprotocols: ${protocols.join(", ")}`);

  // only one of subprotocols can be accepted for the request.
  var promise = new Promise((resolve, reject) => {
    handleProtocol(protocols, req, 0, resolve, reject);
  });
  return promise;
}

// connection store
// {"[subprotocol]": {"[domain]": {"[path]": {"[user]": socket}}}}
var connections = {};

// connection succeeded
wssv.on("connection", (socket, req) => {
  // if subprotocol is not set, close connection.
  if (!req.icSubprotocolUri) {
    console.error("Acceptable subprotocol is not set on connection request. The socket is terminated.");
    socket.terminate();
    return false;
  }
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

  // message as binary (node Buffer type)
  socket.on("message", (message) => {
    var scope = null; // 0; SCHEMA, 1: DOMAIN, 2: PATH (default), 3: USER
    // set scope
    // If subprotocol plugin has onMessage, call it.
    // And it should return scope to dispatch.
    if (plugins[socket.protocol].onMessage) {
      scope = plugins[socket.protocol].onMessage(socket, uri, message);
    }

    // subprotocol found and scope is set
    if (scope !== null) {
      if (AMQP) {
        // if AMQP backend enabled, send to it.
        sendAmqp(uri, scope, message);
      } else {
        // otherwise dispatch message directly.
        dispatchMessage(uri, scope, message)
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`disconnected: ${uri.href}`);
    if (plugins[socket.protocol].onDisconnect) {
      plugins[socket.protocol].onDisconnect(socket, uri);
    }
  });

  socket.on("close", () => {
    console.log(`closed: ${uri.href}`);
    if (plugins[socket.protocol].onClose) {
      plugins[socket.protocol].onClose(socket, uri);
    }
  });

  socket.on("error", (err) => {
    console.error(`error on ${uri.href}: ${err}`);
    if (plugins[socket.protocol].onError) {
      plugins[socket.protocol].onError(socket, uri, err);
    }
  });
});

/**
 * uri: URL object
 * scope: integer
 * message: Buffer[] object
 */
function dispatchMessage(uri, scope, message) {
  console.info(`dispatch to ${uri.href} ${SCOPE[scope]}: ${message}`);

  // dispatch message to clients has same scope.
  // 0: SCHEMA, 1: DOMAIN, 2: PATH (default), 3: USER
  var sockets = [];
  if (SCOPE[scope] === "SCHEMA") {
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
  else if (SCOPE[scope] === "DOMAIN") {
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
  else if (SCOPE[scope] === "USER") {
    sockets = [connections[uri.protocol][uri.host][uri.pathname][uri.auth]];
  }
  else { // (SCOPE[scope] == "PATH" || !SCOPE[scope]), as default
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
  var uri = socket.icSubprotocolUri;
  if (uri) {
    // remove connection URI
    delete connections[uri.protocol][uri.host][uri.pathname][uri.auth];
  }

  // terminate the socket
  socket.terminate();
}

// AMQP connection
const amqpExch = "innocchi";
const amqpConDelay = 5000;
var amqpCh, amqpPromise;
if (AMQP) {
  console.info(`Connecting to AMQP server after ${amqpConDelay} ms: ${AMQP}`);
  setTimeout(function () {
    amqp.connect(AMQP).then(function(con) {
      console.info("AMQP connected", con);
      con.createChannel().then(function(ch) {
        console.info("AMQP channel is created", ch);
        amqpCh = ch;
        amqpCh.assertExchange(amqpExch, "fanout", {durable: false}).then(function () {
          console.info(`AMQP exchange ${amqpExch} is opened.`);
          amqpCh.assertQueue("", {exclusive: true}).then(function(q) {
            console.info(`AMQP queue ${q.queue} is waiting for messages.`);
            amqpCh.bindQueue(q.queue, amqpExch, "").then(function() {
              amqpCh.consume(q.queue, receiveAmqp, {noAck: true}).then(function () {
                console.info("AMQP consumer is started.");
              });
            }).catch(console.warn);
          }).catch(console.warn);
        }).catch(console.warn);
      }).catch(console.warn);
    }).catch(console.warn);
  }, amqpConDelay);
}

// send message to AMQP broker as Buffer
function sendAmqp(uri, scope, message) {
  // pack URI, scope and message into AMQP message as Buffer.
  var amqpMessage = packAmqpMessage(uri, scope, message);

  // send message to AMQP broker
  amqpCh.publish(amqpExch, "", amqpMessage);
  console.info("AMQP send to %s %s: %s", uri.href, SCOPE[scope], message.toString());
}

// receive message from AMQP broker as Buffer
function receiveAmqp(amqpMessage) {
  // unpack AMQP message to URI, scope and WebSocket message
  unpackMessage = unpackAmqpMessage(amqpMessage.content)
  console.info("AMQP receive for %s %s: %s", unpackMessage.uri.href, SCOPE[unpackMessage.scope], unpackMessage.message.toString());
  dispatchMessage(unpackMessage.uri, unpackMessage.scope, unpackMessage.message);
}

/**
 * AMQP message payload
 * | SCOPE 1 byte(UInt8) | URI length 2 byte (UInt16BE) |
 * | URI URI length byte (string) | MESSAGE (string) |
 */

// pack scope, URI and message into AMQP message as Buffer.
function packAmqpMessage(uri, scope, message) {
  var bufferScope = Buffer.alloc(1);
  bufferScope.writeUInt8(scope);
  var uriLength = uri.href.length;
  var bufferUriLength = Buffer.alloc(2);
  bufferUriLength.writeUInt16BE(uriLength);
  var bufferUri = Buffer.alloc(uriLength);
  bufferUri.write(uri.href);
  var bufferMessage = Buffer.from(message);
  var amqpMessage = Buffer.concat([bufferScope, bufferUriLength, bufferUri, bufferMessage]);
  return amqpMessage;
}

// unpack AMQP message into URI, scope and message.
function unpackAmqpMessage(amqpMessage) {
  var scope = amqpMessage.slice(0, 1).readUInt8();
  var uriLength = amqpMessage.slice(1, 3).readUInt16BE();
  var uriEnd = 3 + uriLength;
  var uri = url.parse(amqpMessage.slice(3, uriEnd).toString());
  var bufferMessage = amqpMessage.slice(uriEnd);
  return {scope: scope, uri: uri, message: bufferMessage};
}

// start server
sslServer.listen(PORT, () => {
  console.log(`Server started on port ${sslServer.address().port}`);
});
