import Connection, { createConnection } from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { curry, compose, __, prop, pipe, assoc } from 'ramda';
import { first } from 'rxjs/operators';

export default class Peer {
    constructor (peerType, local, restrictedUuids) {
        this.local = local;
        this.restrictedUuids = restrictedUuids;
        this.peer = new Connection(peerType, local.uuid);
        this.subject = new ReplaySubject(1);

		this.peer.onOpen.then((peer) => {
			this.restrictUuid(peer.uuid);
		});
		this.peer.onClose.then((peer) => {
			this.releaseUuid(peer.uuid);
		});
        // this.peer.onOpen
        //     .pipe(first())
        //     .subscribe(peer => {
        //         this.subject.next(peer);
        //         this.restrictUuid(peer.uuid);
        //     });

        // this.peer.onClose
		// 	.pipe(first())
        //     .subscribe(peer => {
        //         this.subject.complete(peer);
        //         this.releaseUuid(peer.uuid);
        //     });
        console.log(`CREATING ${peerType}`, local.uuid);
    }

    restrictUuid (uuid) {
        this.restrictedUuids.next([...this.restrictedUuids.value, uuid]);
    }

    releaseUuid (uuid) {
        this.restrictedUuids.next(this.restrictedUuids.value.filter(item => item !== uuid));
    }

    errorHandler = (err) => {
        console.error(err);
    }
}
