const fs = require('fs'),
    https = require('https'),
    http = require('http'),
    express = require('express');
const app = express();
const SocketServer = require('./SocketServer');

const server = http.createServer(app);
const PORT = process.env.P2P_SERVER_PORT || 8001;

const socketServer = new SocketServer(server, PORT);

server.listen(PORT, function() {
    console.log('Listening on', PORT);
});
