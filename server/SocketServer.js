const fs = require('fs'),
	https = require('https'),
	http = require('http'),
	express = require('express'),
	Rx = require('rxjs'),
	WebSocket = require('ws');



class SocketServer {
	constructor(server, port) {
		this.PORT = port || 8001;
		this.wServer = new WebSocket.Server({ server });

		this.peers = [];
		this.newOffer = new Rx.ReplaySubject(3);
		this.offers = [];

		this.wServer.on('connection', this.onConnection.bind(this));
	}

	onConnection(connection) {
		let currentUuid;
		let subscriptions = [];

		connection.on('message', message => {
			let action = JSON.parse(message);

			switch (action.type) {
				case 'peer':
					currentUuid = action.data.uuid;

					this.peers.push({
						uuid: currentUuid,
						connection,
						peers: []
					});

					console.log('peer', currentUuid);
					break;

				case 'sendOffer':
					this.offers.unshift(action.data);
					this.newOffer.next();
					console.log('sendOffer', action.data.uuid, this.offers.map(offer => offer.uuid));
					break;

				case 'requestOffer':
					console.log('requestOffer', action.data.uuid);
					let restrictedUuids = [...(action.data.restrictedUuids || []), currentUuid];
					let targetUuids = (action.data.targetUuids || []).filter(uuid => uuid !== currentUuid);

					if (!this.offers.length && this.peers[0]) {
						this.sendMessage({
							type: 'createOffer'
						}, this.peers[0].connection);
					}
					let sub = this.newOffer
						.map(() =>
							this.offers
								.filter(offer => {
									return this.getPeer(currentUuid).peers
										.map(peer => peer.uuid)
										.indexOf(offer.uuid) === -1;
								})
								.find(offer => targetUuids.indexOf(offer.uuid) !== -1 || restrictedUuids.indexOf(offer.uuid) === -1)
						)
						.filter(offer => offer)
						.first()
						.subscribe(offer => {
							this.sendMessage({
								type: 'offer',
								data: offer
							}, connection);


							let sourcePeer = this.getPeer(offer.uuid);
							let targetPeer = this.getPeer(currentUuid);

							if (sourcePeer && targetPeer) {
								sourcePeer.peers.push(targetPeer);
								targetPeer.peers.push(sourcePeer);
							}

							console.log('requestOffer - sent', offer.uuid);
							this.offers = this.offers.filter(item => item !== offer);
						});

					subscriptions.push(sub);
					break;

				case 'sendAnswer':
					console.log('sendAnswer', action.data.uuid);

					let targetPeer = this.getPeer(action.data.target);

					if (targetPeer) {
						this.sendMessage({
							type: 'answer',
							data: action.data
						}, targetPeer.connection);
					}

					break;

				case 'connected':
					const { source, target } = action.data;
					console.log('connected', this.getPeers());

					this.sendMessage({
						type: 'overview',
						data: {
							nodes: this.getPeers()
						}
					}, connection);

					break;
			}

		});

		connection.on('close', () => {
			this.deletePeer(currentUuid);

			subscriptions.forEach(sub => sub.unsubscribe());

			console.log('close', currentUuid, this.getPeers());

			let firstPeer = this.peers[0];

			if (!firstPeer) {
				return;
			}

			this.checkDisconnectedComponents(firstPeer);

			this.sendMessage({
				type: 'overview',
				data: {
					nodes: this.getPeers()
				}
			}, firstPeer.connection);
		});

		connection.on('error', err => {
			console.log(err);
		});
	}

	checkDisconnectedComponents(peer) {
		let components = this.getConnectedPeers(peer);

		if (components.length > 1) {
			components.reduce((prev, curr) => {
				prev.forEach(peer => {
					this.sendMessage({
						type: 'createOffer'
					}, peer.connection);
				});

				curr.slice(0, prev.length)
					.forEach(peer => {
						this.sendMessage({
							type: 'createAsk',
							data: {
								targetUuids: prev.map(prev => prev.uuid)
							}
						}, peer.connection);
					});
				return curr;
			});
		}
	}

	getConnectedPeers(peer) {
		let checkPeer = (peer, visited) => {
			return [peer, ...peer.peers]
				.filter(peer => {
					return !visited[peer.uuid];
				})
				.map(peer => {
					visited[peer.uuid] = true;
					return peer;
				})
				.reduce((acc, peer) => {
					let peers = checkPeer(peer, visited);
					return [...acc, peer, ...peers];
				}, []);
		};

		let visited = {};
		let components = [];

		do {
			components = [...components, checkPeer(peer, visited)];
		} while (peer = this.peers.filter(peer => !visited[peer.uuid]).pop())

		return components.sort((c1, c2) => c1.length - c2.length);
	}

	deletePeer(uuid) {
		this.peers = this.peers.filter(peer => peer.uuid !== uuid);
		this.peers.forEach(peer => {
			peer.peers = peer.peers
				.filter(peer => peer.uuid !== uuid);
		});

		this.offers = this.offers.filter(offer => offer.uuid !== uuid);
	}

	getPeer(uuid) {
		return this.peers.find(peer => peer.uuid === uuid);
	}

	getPeers(peers) {
		return this.peers.map(peer => ({
			uuid: peer.uuid,
			peers: peer.peers.map(peer => peer.uuid)
		}));
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
}
module.exports = SocketServer;
