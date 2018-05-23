import PeerFactory from './PeerFactory';
import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

export default class Peers {
	constructor(local) {
		this.subject = new Subject();
		this.message = new Subject();
		this.overview = new ReplaySubject(1);
		this.local = local;
		this.pool = new BehaviorSubject([]);
		this.restrictedUuids = new BehaviorSubject([this.local.uuid]);
		this.peerFactory = new PeerFactory();
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
			this.createPeer('offer', true);
		});

		this.createPeer('ask');
	}

	createPeer(peerType, targets) {
		let peer = this.peerFactory.create(peerType, this.local, this.restrictedUuids);

		let firstPeerConnection = peer.subject
			.first();

		firstPeerConnection
			.subscribe(peer => {
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

		peer.subject
			.last()
			.subscribe(peer => {
				console.log(this.pool.value);
				this.pool.next(this.pool.value.filter(item => item.uuid !== peer.uuid));
				this.createPeer(peerType);
			});

		this.pool
			.filter(pool => pool.length <= this.PEERS_LIMIT || targets)
			.first()
			.subscribe(() => {
				peer.init(targets);
			});

		return firstPeerConnection;
	}

	broadcast(type, message, id = Date.now() + this.local.uuid) {
		this.pool.value
			.forEach(peer => {
				peer.broadcast(type, message, id);
			});
	}

};
