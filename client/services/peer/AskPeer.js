import Connection from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import Peer from './Peer';
import { curry, pipeP, composeP, tap, __ } from 'ramda';

const ask =  curry((peer, targetUuids) => {
	peer.local.socket.send('requestOffer', {
		uuid: peer.local.uuid,
		restrictedUuids: peer.restrictedUuids.value,
		targetUuids
	});
	return new Promise((resolve, reject) => {
		let handle = offer => {

			if (peer.restrictedUuids.value.indexOf(offer.uuid) === -1) {
				console.log('received offer', offer);
				peer.local.socket.off('offer', handle);
				// peer.restrictUuid(offer.uuid);
				resolve(offer);
			} else {
				peer.local.socket.send('sendOffer', offer);
			}
		};

		peer.local.socket.on('offer', handle);
	});
})

const answer = curry((peer, offer) => {
	peer.uuid = offer.uuid;

	return peer.connection
		.setRemoteDescription(new RTCSessionDescription(offer.desc))
		.then(() => peer.connection.createAnswer())
		.then(desc => {
			let promiseDesc = peer.connection
				.setLocalDescription(desc)
				.then(() => desc);

			let promiseIce = peer.getIceCandidate();
			return Promise.all([promiseDesc, promiseIce]);
		})
		.then(([desc, ice]) => {
			return peer.connection
				.addIceCandidate(new RTCIceCandidate(ice))
				.then(() => [desc, ice, offer]);
		})
		.then(data => {
			peer.local.socket.send('usedOffer', offer);
			return data;
		});

});

const sendAnswer = curry((peer, [desc, ice, offer]) => {
	let answer = {
		uuid: peer.local.uuid,
		target: offer.uuid,
		desc,
		ice,
		offerId: offer.id,
		answerId: peer.id
	};
	console.log('answer sent', answer);
	peer.local.socket.send('sendAnswer', answer);
});

const open = curry((peer, __) => {
	return peer.onOpen.then(() => peer);
});

export const createAskPeer = local => new Connection('ask', local);
export const initAskPeer = curry((targets, peer) => {
	const askPeer = ask(peer);
	const answerPeer = answer(peer);
	const sendAnswerPeer = sendAnswer(peer);
	const openPeer = open(peer);
	console.log('INIT AskPeer', peer);

	return pipeP(
		askPeer,
		answerPeer,
		sendAnswerPeer,
		openPeer
	)(targets);
});
