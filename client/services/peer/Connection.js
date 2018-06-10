import { Subject } from 'rxjs/Subject'
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/zip';
import 'rxjs/add/operator/map';
import { curry } from 'ramda';
import { pipe } from 'rxjs';

const bootstrapPeer = curry((type, local) => {
	return {
		type,
		local,
		id: Math.floor(Math.random() * 100000),
		handlers: {},
		defaultHandler: () => {}
	}
});

const addConnection = curry((config, peer) => {
	peer.connection = new RTCPeerConnection(config);
	return peer;
});

const addOnOpen = curry((handler, peer) => {
	peer.onOpen = Promise.all([
		onSendChannelOpen(peer),
		onReceiveChannelOpen(peer)
	]).then(() => peer);
	peer.onOpen.then(handler);
	return peer;
});

const addOnClose = curry((handler, peer) => {
	peer.onClose = onChannelClose(peer);
	peer.onClose.then(handler);
	return peer;
});

const addConfig = curry((config, peer) => {
	peer.config = config;
	return peer;
});

export const getIceCandidate = curry((peer) => {
	return new Promise((resolve, reject) => {
		peer.connection.onicecandidate = event => {
			if (event.candidate !== null) {
				resolve(event.candidate);
			}
		};
	});
});

const onChannelClose = curry((peer) => {
	return new Promise((resolve) => {
		peer.sendChannel.onclose = () => {
			console.log(
				'send datachannel closed',
				peer.sendChannel.readyState
			);
			resolve(peer);
		};
	});
});

const onSendChannelOpen = curry((peer) => {
	peer.sendChannel = peer.connection.createDataChannel(
		`channel ${Math.random()}`
	);

	return new Promise((resolve, reject) => {
		peer.sendChannel.onerror = err => {
			reject(err);
		};

		peer.sendChannel.onopen = () => {
			console.log(
				'send datachannel opened',
				peer.sendChannel.readyState
			);
			resolve(peer.sendChannel);
		};
	})
});


const restrictUuid = curry((peer) => {
	peer.restrictedUuids.next([...peer.restrictedUuids.value, peer.uuid]);
	return peer;
});

const releaseUuid = curry((peer) => {
	peer.restrictedUuids.next(peer.restrictedUuids.value.filter(item => item !== peer.uuid));
	return peer;
});

const onMessage = curry((peer, message) => {
	let payload;

	try {
		payload = JSON.parse(message.data);
	} catch (e) {
		payload = message.data;
	}
	let type = payload.type || 'response';

	let handlers = peer.handlers[type] || [];
	[...handlers, peer.defaultHandler].forEach(handler => {
		handler(payload);
	});
});

export const onReceiveChannelOpen = curry((peer) => {
	return new Promise(resolve => {
		peer.connection.ondatachannel = event => {
			peer.receiveChannel = event.channel;
			peer.receiveChannel.onmessage = onMessage(peer);

			window.onbeforeunload = () => {
				peer.sendChannel.close();
				peer.receiveChannel.close();
			};

			peer.receiveChannel.onopen = () => {
				console.log(
					'receive datachannel opened',
					peer.receiveChannel.readyState
				);
				resolve(peer.receiveChannel);
			};

			peer.receiveChannel.onclose = () => {
				console.log(
					'receive datachannel closed',
					peer.receiveChannel.readyState
				);
				peer.sendChannel.close();
			};
		};
	});
});

export const on = curry((peer, type, handler) => {
	peer.handlers[type] = peer.handlers[type] || [];
	peer.handlers[type].push(handler);
	return peer;
});

export const onAll = curry((peer, handler) => {
	peer.defaultHandler = handler;
	return peer;
});

export const once = curry((peer, type, handler) => {
	peer.handlers[type] = peer.handlers[type] || [];
	let handlerWrapper = message => {
		handler(message);
		peer.off(type, handler);
	};
	peer.handlers[type].push(handlerWrapper);
	return peer;
});

export const off = curry((peer, type, handler) => {
	peer.handlers[type] = (peer.handlers[type] || []).filter(
		item => item !== handler
	);
	return peer;
});

export const send = curry((peer, type, message, broadcast = false, id = Date.now()) => {
	let data = {
		type,
		message,
		id,
		broadcast: broadcast || false,
		source: peer.local.uuid,
		target: peer.uuid
	};

	console.log('Sending to', data.target);
	if (type === 'response') {
		return peer.sendChannel.send(data.blob);
	}
	if (typeof data !== 'string') {
		data = JSON.stringify(data);
	}
	if (peer.sendChannel.readyState === 'open') {
		peer.sendChannel.send(data);
	}
});

export const broadcast = curry((peer, type, message, id = Date.now()) => {
	send(peer, type, message, true, id);
});


export const createConnection = (type, local) => {
	const config = {
		iceServers: [
			{ urls: 'stun:stun.l.google.com:19302' },
			{
				urls: 'turn:192.158.29.39:3478?transport=tcp',
				credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
				username: '28224511:1379330808'
			}
		]
	};

	return pipe(
		bootstrapPeer(type),
		addConfig(config),
		addConnection(config),
		addOnOpen(restrictUuid),
		addOnClose(releaseUuid)
	)(local);
};
