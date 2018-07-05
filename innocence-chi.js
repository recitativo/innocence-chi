var fs = require('fs');
var https = require('https')
var express = require('express')
var wsServer = require('ws').Server;

var PORT = 8000;
var PING_INTERVAL = 10000;

// ssl settings
opts = {
  cert: fs.readFileSync('./certs/server.crt').toString(),
  key: fs.readFileSync('./certs/server.key').toString(),
  //passphrase: fs.readFileSync('./certs/server.pass').toString(),
};

// test app settings
const app = express();
app.get('/example/', function (req, res) {
  res.sendFile(__dirname + '/example/ws.html');
});

// initialize a simple http server
const sslServer = https.createServer(opts, app);

// initialize the WebSocket server instance
const wssv = new wsServer({ "server": sslServer, "handleProtocols": handleProtocols});

wssv.on('connection', function connection(socket, req) {
  console.log('connection');
  console.log("URI for subprotocol: " + req.icSubprotocolUri);
  // copy icSubprotocolUri to socket
  socket.icSubprotocolUri = req.icSubprotocolUri;

  // set the socket alive
  socket.isAlive = true;
  // if client returns pong, set the socket alive
  socket.on('pong', () => {
    socket.isAlive = true;
  });

  // store socket with URI

  socket.on('message', function incoming(message) {
    console.log('received: %s', message);

    // simply echo message to client
    socket.send(message);

    // simply broadcast message
    wssv.clients.forEach(client => {
      if (client != socket) {
        client.send(message);
      }    
    });

  });

  socket.on('disconnect', function() {
    console.log('disconnect');
  });

  socket.on('close', function() {
    console.log('close');
  });

  socket.on('error', function(err) {
    console.log(err);
  });
});

// handle subprotocols
function handleProtocols(protocols, req) {
  console.log(protocols);
  // accepted subprotocol. if this is set as false, all subprotocol does not accept.
  // only one subprotocol can accept the request.
  var accepted = false;
  // processing subprotocols in order of the list
  protocols.some(protocol => {
    console.log("processing subprotocol: " + protocol);

    // get subprotocol handler
    var protocolHandler = function (req) {
      return (protocol === "sub1") ? "sub1://user@domain/path" : null;
    }

    // run subprotocol handler
    // if handler accept the request, it will returns URI for the client
    // if handler does not accept, it will returns null.
    var uri = protocolHandler(req);

    if (uri) {
      accepted = protocol;
      req.icSubprotocolUri = uri;
      console.log("accepted subprotocol: " + protocol);
      console.log("URI for subprotocol: " + uri);
      return true;
    }
    console.log("rejected subprotocol: " + protocol);
  });
  // return accepted subprotocol
  return accepted;
}

// send ping to client in each specified interval
setInterval(() => {
  wssv.clients.forEach((socket) => {
      // terminate socket if not alive
      if (!socket.isAlive) return socket.terminate();
      // send ping to client
      socket.isAlive = false;
      socket.ping(null, false, true);
  });
}, PING_INTERVAL);

// start server
sslServer.listen(process.env.PORT || PORT, () => {
  console.log(`Server started on port ${sslServer.address().port}`);
});
