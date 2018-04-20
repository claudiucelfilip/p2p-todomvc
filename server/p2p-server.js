// const webpack = require('webpack');
// const middleware = require('webpack-dev-middleware');
// const webpackConfig = require('./webpack.config');
// const compiler = webpack(webpackConfig);

var fs = require('fs'),
    https = require('https'),
    http = require('http'),
    express = require('express'),
    // request = require('request'),
    // requestPromise = require('request-promise'),
    WebSocket = require('ws');
var app = express();

// app.use(
//     middleware(compiler)
// );

// const server = https.createServer({
//         key: fs.readFileSync('./key-localhost.pem'),
//         cert: fs.readFileSync('./cert-localhost.pem'),
//         passphrase: 'lola'
//     },
//     app
// );

const server = http.createServer(app);

const wServer = new WebSocket.Server({ server });

var peers = {},
    offers = [];
wServer.on('connection', function (ws) {
    var currentPeer;

    function sendMessage (message, socket) {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }
        let client = socket || ws;
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }

    ws.on('message', message => {
        let action = JSON.parse(message);

        switch (action.type) {
            case 'peer':
                peers[action.data.uuid] = ws;
                currentPeer = action.data.uuid;
                console.log('New Peer', currentPeer, Object.keys(peers));
                break;
            case 'sendOffer':
                offers.push(action.data);
                console.log(offers.map(offer => offer.uuid));
                broadcast({
                    type: 'newOffer',
                    data: {
                        id: action.data.id,
                        uuid: action.data.uuid
                    }
                });
                break;
            case 'requestOffer':
                console.log(offers.map(offer => offer.uuid));
                let offerId = action.data && action.data.id;
                sendMessage({
                    type: 'offer',
                    data: getOffer(offerId)
                });
                break;
            case 'sendAnswer':
                removeOffer(action.data.id);
                sendMessage({
                    type: 'answer',
                    data: action.data
                },
                    peers[action.data.target]
                );
        }

        function broadcast (message) {
            wServer.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    sendMessage(message, client);
                }
            });
        }
    });

    ws.on('close', () => {
        delete peers[currentPeer];
        offers = offers.filter(offer => {
            return offer.uuid !== currentPeer;
        });
        console.log('Peer Left', currentPeer, Object.keys(peers));
    });

    ws.on('error', err => {
        console.log(err);
    });

    function removeOffer (id) {
        return (offers = offers.filter(offer => offer.id !== id));
    }

    function getOffer (id) {
        var index;
        if (id) {
            index = offers.findIndex(offer => {
                return offer.id === id;
            });
        } else {
            index = offers.findIndex(offer => {
                return offer.uuid !== currentPeer;
            });
        }
        if (index == -1) {
            return null;
        }
        return offers.splice(index, 1)[0];
        // return offers[index];
    }
});
server.listen(8000);