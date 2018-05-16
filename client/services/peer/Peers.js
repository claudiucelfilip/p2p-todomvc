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
		this.peerFactory = new PeerFactory();

		this.PEERS_LIMIT = 3;
	}

	init() {
		this.createPeer('offer');

		Observable.interval(1500)
			.take(2)
			.subscribe(() => {
				this.createPeer('ask');
			});


		this.message.subscribe(data => {
			if (data.type === 'overview') {
                console.log('new overview', data);
                this.overview.next(data.message);
            }
		});

		this.local.socket.on('overview', overview => {
			this.overview.next(overview);
			setTimeout(() => {
				this.broadcast('overview', overview);
			}, 1000);
		});
	}

	createPeer(peerType) {
		let peer = this.peerFactory.create(peerType, this.local, this.pool);

		peer.subject.subscribe(peer => {
			peer.on((payload) => {
				if (payload.broadcast === true) {
					this.broadcast(payload.type, payload.message, payload.visited);
				}
				this.message.next(payload);
			});
			this.pool.next([...this.pool.value, peer]);
			this.subject.next(peer);
		});

		peer.subject.last().subscribe(peer => {
			this.pool.next([...this.pool.value.filter(item => item.id !== peer.id)]);
			this.createPeer(peerType);
		});

		peer.init();
			// .then(data => {
			// 	if (data && data.nodes) {
			// 		this.overview.next(data);
			// 		setTimeout(() => {
			// 			this.broadcast('overview', data);
			// 		}, 2000);

			// 	}
			// });


		return peer;
	}

	broadcast(type, message, visited = []) {

		this.pool.value
			.filter(peer => visited.indexOf(peer.uuid) === -1)
			.forEach(peer => {
				peer.broadcast(type, message, visited);
			});
	}

};
