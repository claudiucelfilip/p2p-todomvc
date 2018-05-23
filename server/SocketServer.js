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
					this.addOffer(action.data);

					console.log('sendOffer', action.data.uuid, this.offers.map(offer => offer.uuid));
					break;

				case 'requestOffer':
					console.log('requestOffer', action.data.uuid);
					let restrictedUuids = [...(action.data.restrictedUuids || []), currentUuid];
					let targetUuids = (action.data.targetUuids || []).filter(uuid => uuid !== currentUuid);

					if (!this.offers.length && this.peers[0]) {
						this.sendMessage({
							type: 'createOffer'
						}, this.peers[this.peers.length - 1].connection);
					}
					let sub = this.newOffer
						.map(() =>
							this.offers
								.filter(offer => {
									return this.getPeer(currentUuid).peers
										.map(peer => peer.uuid)
										.indexOf(offer.uuid) === -1;
								})
								.slice()
								.reverse()
								.find(offer => targetUuids.indexOf(offer.uuid) !== -1 || restrictedUuids.indexOf(offer.uuid) === -1)
						)
						.filter(offer => offer)
						.first()
						.subscribe(offer => {
							console.log(currentUuid);
							this.sendMessage({
								type: 'offer',
								data: offer
							}, connection);

							console.log('requestOffer - sent', offer.uuid);
						});

					subscriptions.push(sub);
					break;
				case 'usedOffer':
					let offer = action.data;
					this.offers = this.offers.filter(item => item.id !== offer.id);
					break;
				case 'sendAnswer':
					console.log('sendAnswer', action.data.uuid);

					let peer = this.getPeer(action.data.target);

					if (peer) {
						this.sendMessage({
							type: 'answer',
							data: action.data
						}, peer.connection);
					}

					break;

				case 'connected':
					const { source, target } = action.data;
					console.log('connected', this.getPeers());

					let sourcePeer = this.getPeer(source);
					let targetPeer = this.getPeer(target);

					if (sourcePeer && targetPeer) {
						if (sourcePeer.peers.indexOf(targetPeer) === -1) {
							sourcePeer.peers.push(targetPeer);
						}
					}

					this.checkDisconnectedComponents(this.getPeer(currentUuid));
					this.sendOverview();

					break;

				case 'forceCheck':
					this.checkDisconnectedComponents(this.getPeer(currentUuid));
					break;
			}

		});

		connection.on('close', () => {
			this.deletePeer(currentUuid);
			this.offers = this.offers.filter(offer => offer.uuid !== currentUuid);

			subscriptions.forEach(sub => sub.unsubscribe());

			console.log('close', currentUuid, this.getPeers());

			this.checkDisconnectedComponents();
			this.sendOverview();
		});

		connection.on('error', err => {
			console.log(err);
		});
	}

	sendOverview() {
		this.peers.forEach(peer => {
			this.sendMessage({
				type: 'overview',
				data: {
					nodes: this.getPeers()
				}
			}, peer.connection);
		});
	}

	addOffer(offer) {
		if (this.offers.map(offer => offer.uuid).indexOf(offer.uuid) === -1) {
			this.offers.unshift(offer);
			this.newOffer.next();
		}
	}

	checkDisconnectedComponents(peer = this.peers[0]) {
		if (!peer) {
			return;
		}
		let components = this.getConnectedPeers(peer);

		if (components.length > 1) {
			components.reduce((prev, curr) => {
				prev
					.filter(peer => this.offers.map(offer => offer.uuid).indexOf(peer.uuid) === -1)
					.forEach((peer, index) => {
						this.sendMessage({
							type: 'createOffer'
						}, peer.connection);

						return peer;
					});

				curr.forEach((peer, index) => {
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
		this.peers = this.peers
			.map(peer => {
				peer.peers = peer.peers
					.filter(peer => peer.uuid !== uuid);

				return peer;
			})
			.filter(peer => peer.uuid !== uuid);
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
