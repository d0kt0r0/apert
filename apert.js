process.title = 'apert';
var stderr = process.stderr;

// dependencies
var http = require('http');
var url = require('url');
var WebSocket = require('ws');
var express = require('express');
var nopt = require('nopt');
var osc = require('osc');
var fs = require('fs');

// parse command-line options
var knownOpts = {
    "password" : [String, null],
    "javascript" : [String, null],
    "tcp-port" : [Number, null],
    "osc-port" : [Number, null],
    "help": Boolean
};

var shortHands = {
    "p" : ["--password"],
    "t" : ["--tcp-port"],
    "o" : ["--osc-port"],
    "j" : ["--javascript"]
};

var parsed = nopt(knownOpts,shortHands,process.argv,2);

if(parsed['help']!=null) {
    stderr.write("usage:\n");
    stderr.write(" --help (-h)               this help message\n");
    stderr.write(" --password [word] (-p)    password to authenticate OSC messages to server (required)\n");
    stderr.write(" --osc-port (-o) [number]  UDP port on which to receive OSC messages (default: 8080)\n");
    stderr.write(" --tcp-port (-t) [number]  TCP port for plain HTTP and WebSocket connections (default: 8080)\n");
    stderr.write(" --javascript (-j) [path]  path to piece-specific javascript file to serve as specific.js\n");
    process.exit(1);
}

var password = parsed['password'];
if(password == null) {
    stderr.write("Error: --password option is not optional!\n");
    stderr.write("use --help to display available options\n");
    process.exit(1);
}

var oscPort = parsed['osc-port'];
if(oscPort==null) oscPort = 8080;
var tcpPort = parsed['tcp-port'];
if(tcpPort==null) tcpPort = 8080;

var javascript = parsed['javascript'];
var specific;
if(javascript!=null) {
  fs.readFile(javascript,'utf8', function (err,data) {
    if (err) {
      console.log(err);
      return;
    }
    specific = data;
    console.log("specific javascript loaded from " + javascript);
  });
}

// create HTTP (Express) server
var server = http.createServer();
var app = express();
app.use(express.static(__dirname));
app.get('/specific.js',function(req,res,next) {
  if(specific!=null) {
    res.send(specific);
  }
  res.end();
});
app.get('/?', function(req, res, next) {
  res.send('<html><head><script src="base.js"></script><script src="specific.js"></script></head><body onload="baseOnLoad()"></body></html>');
  res.end();
});
server.on('request',app);

// create WebSocket server
var wss = new WebSocket.Server({server: server});
wss.broadcast = function(data) {
  for (var i in this.clients) this.clients[i].send(data);
};
wss.on('connection',function(ws) {
  var location = url.parse(ws.upgradeReq.url, true);
  console.log("new WebSocket connection: " + location);
  ws.on('message',function(m) {
      var n = JSON.parse(m);
      if(n.password != password) {
        console.log("invalid password ")
      } else {
        if(n.request == "oscToAll") {
          oscToAll(n.address,n.args);
        }
      }
  });
});

// make it go
server.listen(tcpPort, function () { console.log('Listening on ' + server.address().port) });

// create OSC server (listens on UDP port, resends OSC messages to browsers)
var udp = new osc.UDPPort( { localAddress: "0.0.0.0", localPort: oscPort });
if(udp!=null)udp.open();
udp.on('message', function(m) {
  oscToAll(m.address,m.args);
});

function oscToAll(address,args) {
  var n = { 'type': 'osc', 'address': address, 'args': args };
  try { wss.broadcast(JSON.stringify(n)); }
  catch(e) { stderr.write("warning: exception in WebSocket send\n"); }
}
