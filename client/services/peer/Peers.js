import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import * as R from 'ramda';
import { compose, composeP, curry, __, assoc } from 'ramda';
import { createOfferPeer, initOfferPeer } from './OfferPeer';
import { createAskPeer, initAskPeer } from './AskPeer';

const subscribeToPeerStream = R.curry((handle, stream) => {
	return stream.subscribe(handle);
});

const createPeer = curry((local, type) => {
	switch (type) {
		case 'offer':
			return createOfferPeer(local);
		case 'ask':
			return createAskPeer(local);
	}
});

const initPeer = curry((targets, peer) => {
	switch (peer.type) {
		case 'offer':
			return initOfferPeer(targets, peer);
		case 'ask':
			return initAskPeer(targets, peer);
	}
})

const firstPeerConnection = R.compose(
	R.invoker(0, 'first'),
	R.prop('subject')
);

const setRestrictions = curry((uuids, peer) => {
	peer['restrictedUuids'] = uuids;
	return peer;
});
export default class Peers {
	constructor(local) {
		this.subject = new Subject();
		this.message = new Subject();
		this.overview = new ReplaySubject(1);
		this.local = local;
		this.pool = new BehaviorSubject([]);
		this.restrictedUuids = new BehaviorSubject([this.local.uuid]);
		this.restrictedMessages = [];
		this.PEERS_LIMIT = 3;
	}
	init() {
		this.local.socket.on('overview', overview => {
			this.overview.next(overview);
			console.log('new overview', overview);
		});

		Observable.interval(6000)
			.withLatestFrom(this.pool)
			.map(([_, pool]) => pool)
			.filter(pool => !pool.length)
			.subscribe(() => {
				console.log('send forceCheck');
				this.local.socket.send('forceCheck');
			});

		this.local.socket.on('createAsk', data => {
			console.log('createAsk received', data);
			this.createPeer('ask', data.targetUuids);
		});

		this.local.socket.on('createOffer', data => {
			console.log('createOffer received');
			this.createPeer('offer');
		});

		this.createPeer('ask');
	}

	createPeer(peerType, targets) {
		const getPeer = compose(
			setRestrictions(this.restrictedUuids),
			createPeer(this.local)
		);

		const peer = getPeer(peerType);
		const initializedPeer = initPeer(targets, peer);

		initializedPeer
			.then((peer) => {
				peer.on((data) => {
					if (this.restrictedMessages.indexOf(data.id) !== -1) {
						return;
					}
					this.restrictedMessages.push(data.id);

					if (data.broadcast === true) {
						this.broadcast(data.type, data.message, data.id);
					}
					this.message.next(data);
				});

				this.pool.next([...this.pool.value, peer]);
				this.subject.next(peer);

				this.local.socket.send('connected', {
					source: this.local.uuid,
					target: peer.uuid
				});

				this.createPeer(peerType);
			});
	}

	broadcast(type, message, id = Date.now() + this.local.uuid) {
		this.pool.value
			.forEach(peer => {
				peer.broadcast(type, message, id);
			});
	}

};
