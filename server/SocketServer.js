const fs = require('fs'),
	https = require('https'),
	http = require('http'),
	express = require('express'),
	Rx = require('rxjs'),
	WebSocket = require('ws');



class SocketServer {
	constructor (server, port) {
		this.PORT = port || 8001;
		this.wServer = new WebSocket.Server({ server });

		this.peers = {};
		this.links = [];
		this.newOffer = new Rx.ReplaySubject(1);
		this.offers = [];

		this.wServer.on('connection', this.onConnection.bind(this));
	}

	onConnection (connection) {
		let currentPeer;
		let subscriptions = [];

		connection.on('message', message => {
			let action = JSON.parse(message);

			switch (action.type) {
				case 'peer':
					this.peers[action.data.uuid] = connection;
					currentPeer = action.data.uuid;
					console.log('peer', currentPeer);
					break;

				case 'sendOffer':
					this.offers.push(action.data);
					this.newOffer.next();
					console.log('sendOffer', action.data.uuid, this.offers);
					break;

				case 'requestOffer':
					console.log('requestOffer', action.data.uuid);
					let sub = this.newOffer
						.map(() => this.offers.find(offer => offer.uuid !== currentPeer))
						.filter(offer => offer)
						.first()
						.subscribe(offer => {
							this.sendMessage({
								type: 'offer',
								data: offer
							}, connection);
							console.log('requestOffer - sent', offer);
							this.offers = this.offers.filter(item => item !== offer);
						});

					subscriptions.push(sub);

					break;

				case 'sendAnswer':
					console.log('sendAnswer', action.data.uuid);
					this.sendMessage({
						type: 'answer',
						data: action.data
					}, this.peers[action.data.target]);
					break;

				case 'connected':
					const { source, target } = action.data;
					this.links.push({
						source,
						target
					});
					console.log('connected', this.links);

					this.sendMessage({
						type: 'overview',
						data: {
							nodes: this.getNodes(),
							links: this.links,
							offers: this.offers
						}
					}, connection);
					
					break;
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

			subscriptions.forEach(sub => sub.unsubscribe());

			console.log('close', currentPeer, Object.keys(this.peers), this.links);

			const firstPeer = this.peers[Object.keys(this.peers)[0]];
			this.sendMessage({
				type: 'overview',
				data: {
					nodes: this.getNodes(),
					links: this.links,
					offers: this.offers
				}
			}, firstPeer);
		});

		connection.on('error', err => {
			console.log(err);
		});
	}

	getNodes () {
		return Object.keys(this.peers).map(key => ({ id: +key }));
	}

	sendMessage (message, client) {
		if (typeof message !== 'string') {
			message = JSON.stringify(message);
		}

		if (client && client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	}

	broadcast (message, connection) {
		this.wServer.clients.forEach(client => {
			if (client !== connection && client.readyState === WebSocket.OPEN) {
				this.sendMessage(message, connection, client);
			}
		});
	}
}
module.exports = SocketServer;
