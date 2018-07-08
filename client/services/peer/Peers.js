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

	const init = curry((peer, fn) => fn(peer));

	let out = pipe(
		getInitializer,
		init(peer)
	)(peer);

	return out;
});

const setRestrictions = curry((uuids, peer) => {
	peer['restrictedUuids'] = uuids;
	return peer;
});

const bootstrapPeers = curry((peerLimit, local) => {
	return {
		subject: new Subject(),
		message: new Subject(),
		overview: new ReplaySubject(1),
		local,
		pool: new BehaviorSubject([]),
		restrictedUuids: new BehaviorSubject([local.uuid]),
		restrictedMessages: [],
		peerLimit
	}
});


const afterInitHandler = curry((peers, peerType, peer) => {
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

});

const addPeer = (peers, peerType, targets) => {
	if (peers.pool.value.length > peers.peerLimit) {
		return;
	}
	return compose(
		composeP(
			afterInitHandler(peers, peerType),
			initPeer([])
		),
		setRestrictions(peers.restrictedUuids),
		createPeer(peers.local)
	)(peerType);
}

export const broadcast = curry((peers, type, message, id = Date.now()) => {
	peers.pool.value
		.forEach(peer => {
			Connection.broadcast(peer, type, message, id);
		});
});

export const send = Connection.send;

export const createPeers = curry((local, peerLimit) => {
	return pipe(
		bootstrapPeers(peerLimit)
	)(local);
});

export const initPeers = curry((peers) => {

	Observable.interval(6000)
		.withLatestFrom(peers.pool)
		.map(([_, pool]) => pool)
		.filter(pool => !pool.length)
		.subscribe(() => {
			console.log('send forceCheck');
			peers.local.socket.send('forceCheck');
		});

	peers.local.socket.on('overview', overview => {
		peers.overview.next(overview);
		console.log('new overview', overview);
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

