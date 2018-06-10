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
import * as Connection from './Connection';
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

};

const bootstrapPeers = curry((local) => {
	return {
		subject: new Subject(),
		message: new Subject(),
		overview: new ReplaySubject(1),
		local: local,
		pool: new BehaviorSubject([]),
		restrictedUuids: new BehaviorSubject([local.uuid]),
		restrictedMessages: [],
		PEERS_LIMIT: 3,
	}
});
export const initPeers = curry((peers) => {
	peers.local.socket.on('overview', overview => {
		peers.overview.next(overview);
		console.log('new overview', overview);
	});

	Observable.interval(6000)
		.withLatestFrom(peers.pool)
		.map(([_, pool]) => pool)
		.filter(pool => !pool.length)
		.subscribe(() => {
			console.log('send forceCheck');
			peers.local.socket.send('forceCheck');
		});

	peers.local.socket.on('createAsk', data => {
		console.log('createAsk received', data);
		addPeer(peers, 'ask', data.targetUuids);
	});

	peers.local.socket.on('createOffer', data => {
		console.log('createOffer received');
		addPeer(peers, 'offer');
	});

	addPeer(peers, 'ask');
});

const addPeer = (peers, peerType, targets) => {
	const getPeer = compose(
		setRestrictions(peers.restrictedUuids),
		createPeer(peers.local)
	);

	const peer = getPeer(peerType);

	const afterInitHandler = (peer) => {
		const onAllMessages = Connection.onAll(peer);

		onAllMessages((data) => {
			if (peers.restrictedMessages.indexOf(data.id) !== -1) {
				return;
			}
			peers.restrictedMessages.push(data.id);

			if (data.broadcast === true) {
				broadcast(peers, data.type, data.message, data.id);
			}
			peers.message.next(data);
		});

		peers.pool.next([...peers.pool.value, peer]);
		peers.subject.next(peer);

		peers.local.socket.send('connected', {
			source: peers.local.uuid,
			target: peer.uuid
		});

		addPeer(peers, peerType);
	};

	composeP(
		afterInitHandler,
		initPeer([])
	)(peer);
}

export const broadcast = curry((peers, type, message, id = Date.now()) => {
	peers.pool.value
		.forEach(peer => {
			Connection.broadcast(peer, type, message, id);
		});
});

export const send = Connection.send;

export const createPeers = curry((local) => {
	return pipe(
		bootstrapPeers
	)(local);
});
