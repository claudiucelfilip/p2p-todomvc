import Connection from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';

export default class Peer {
	constructor(peerType, local, restrictedPool) {
		this.local = local;
		this.restrictedPool = restrictedPool;
		this.peer = new Connection(peerType, local.uuid);
		this.subject = new ReplaySubject(1);

		this.peer.onOpen
			.first()
			.subscribe(peer => {
				this.subject.next(peer);
			});

		this.peer.onClose
			.first()
			.subscribe(peer => {
				this.subject.complete(peer);
			});
		console.log(`CREATING ${peerType}`, local.uuid);
	}

	errorHandler = (err) => {
		this.subject.error(err);
	}
}
