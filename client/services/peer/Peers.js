import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import * as R from 'ramda';
import {
	compose,
	composeP,
	curry,
	__,
	assoc,
	cond,
	T,
	prop,
	identity,
	lensProp,
	set,
	view,
	over,
	always,
	equals,
	flip, apply
} from 'ramda';
import { createOfferPeer, initOfferPeer } from './OfferPeer';
import { createAskPeer, initAskPeer } from './AskPeer';
import { broadcast, on, send } from './Connection';
import { pipe } from 'rxjs';

const subscribeToPeerStream = R.curry((handle, stream) => {
	return stream.subscribe(handle);
});

const createPeer = local => cond([
	[equals('offer'), type => createOfferPeer(local)],
	[equals('ask'), type => createAskPeer(local)],
	[T, identity(null)]
]);


const initPeer = curry((targets, peer) => {
	const getInitializer = pipe(
		prop('type'),
		cond([
			[equals('offer'), () => initOfferPeer(targets)],
			[equals('ask'), () => initAskPeer(targets)],
			[T, identity(null)]
		])
	);

	const flipApply = flip(apply);
	const init = curry((peer, fn) => fn(peer));

	let out = pipe(
		getInitializer,
		init(peer)
	)(peer);

	return out;
});

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

		const afterInitHandler = (peer) => {
			const onMessage = on(peer);

			onMessage((data) => {
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
		};

		composeP(
			afterInitHandler,
			initPeer([])
		)(peer);
	}

	broadcast(type, message, id = Date.now() + this.local.uuid) {
		this.pool.value
			.forEach(peer => {
				broadcast(peer, type, message, id);
			});
	}

	send = send
};
