const fs = require('fs'),
	https = require('https'),
	http = require('http'),
	express = require('express'),
	WebSocket = require('ws');

class SocketServer {
	constructor(server, port) {
		this.PORT = port || 8001;
		this.wServer = new WebSocket.Server({ server });

		this.peers = {};
		this.links = [];
		this.offers = [];

		this.wServer.on('connection', this.onConnection.bind(this));
	}

	onConnection(connection) {
		let currentPeer;

		connection.on('message', message => {
			let action = JSON.parse(message);

			switch (action.type) {
				case 'peer':
					this.peers[action.data.uuid] = connection;
					currentPeer = action.data.uuid;
					console.log('New Peer', currentPeer);
					break;

				case 'sendOffer':
					this.offers.push(action.data);
					console.log(this.offers.map(offer => offer.uuid));
					this.broadcast({
						type: 'newOffer',
						data: {
							id: action.data.id,
							uuid: action.data.uuid
						}
					}, connection);
					break;

				case 'requestOffer':
					console.log(this.offers.map(offer => offer.uuid));
					this.sendMessage({
						type: 'offer',
						data: this.getOffer(currentPeer)
					}, connection);
					break;

				case 'sendAnswer':
					this.removeOffer(action.data.id);

					this.sendMessage({
						type: 'answer',
						data: action.data
					}, this.peers[action.data.target]);

					const { uuid, target } = action.data;
					this.links.push({
						source: uuid,
						target
					});

					this.sendMessage({
						type: 'overview',
						data: {
							nodes: this.getNodes(),
							links: this.links
						}
					}, connection);
			}

		});

		connection.on('close', () => {
			delete this.peers[currentPeer];
			this.links = this.links.filter(link => {
				return link.source !== currentPeer && link.target !== currentPeer;
			})
			this.offers = this.offers.filter(offer => {
				return offer.uuid !== currentPeer;
			});

			console.log('Peer Left', currentPeer, Object.keys(this.peers));

			const firstPeer = this.peers[Object.keys(this.peers)[0]];

			this.sendMessage({
				type: 'overview',
				data: {
					nodes: this.getNodes(),
					links: this.links
				}
			}, firstPeer);
		});

		connection.on('error', err => {
			console.log(err);
		});
	}

	getNodes() {
		return Object.keys(this.peers).map(key => ({ id: +key }));
	}

	sendMessage(message, client) {
		if (typeof message !== 'string') {
			message = JSON.stringify(message);
		}

		if (client && client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	}

	broadcast(message, connection) {
		this.wServer.clients.forEach(client => {
			if (client !== connection && client.readyState === WebSocket.OPEN) {
				this.sendMessage(message, connection, client);
			}
		});
	}

	removeOffer(id) {
		return (this.offers = this.offers.filter(offer => offer.id !== id));
	}

	getOffer(currentPeer) {
		let index = this.offers.findIndex(offer => offer.uuid !== currentPeer);
		if (index === -1) {
			return;
		}
		return this.offers.splice(index, 1)[0];
	}
}
module.exports = SocketServer;
