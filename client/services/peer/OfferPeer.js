import { createConnection, getIceCandidate } from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import Peer from './Peer';
import { curry, pipeP, __, tap } from 'ramda';

const offer = curry((peer, targets) => {
	return peer.connection.createOffer()
		.then(desc => {
			let promiseDesc = peer.connection
				.setLocalDescription(desc)
				.then(() => desc);

			 let promiseIce = getIceCandidate(peer);
			return Promise.all([promiseDesc, promiseIce]);
		});
});

const wait = curry((peer, __) => {
	return new Promise((resolve) => {
		let handle = answer => {

			if (peer.restrictedUuids.value.indexOf(answer.uuid) === -1) {
				console.log('received answer', answer);
				peer.uuid = answer.uuid;
				// peer.restrictUuid(peer.uuid);
				peer.local.socket.off('answer', handle);
				resolve(answer);
			}
		};
		peer.local.socket.on('answer', handle);
	});
});

const connect = curry((peer, answer) => {
	return peer.connection
		.setRemoteDescription(new RTCSessionDescription(answer.desc))
		.then(() => {
			return peer.connection.addIceCandidate(
				new RTCIceCandidate(answer.ice)
			);
		});
});

const sendOffer = curry((peer, [desc, ice]) => {
	let offer = {
		uuid: peer.local.uuid,
		desc,
		ice,
		id: peer.id
	};

	console.log('offer sent', offer);
	peer.local.socket.send('sendOffer', offer);
	return peer;
});

const open = curry((peer, __) => {
	return peer.onOpen.then(() => peer);
});

export const createOfferPeer = local => {
	return createConnection('offer', local);
};


export const initOfferPeer = curry((targets, peer) => {
	const offerPeer = offer(peer);
	const waitPeer = wait(peer);
	const connectPeer = connect(peer);
	const sendOfferPeer = sendOffer(peer);
	const openPeer = open(peer);
	console.log('INIT OfferPeer', peer);


	return pipeP(
		offerPeer,
		sendOfferPeer,
		waitPeer,
		connectPeer,
		openPeer
	)(targets);
});
