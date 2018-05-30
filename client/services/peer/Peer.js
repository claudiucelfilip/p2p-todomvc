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

        this.peer.onOpen
            .first()
            .subscribe(peer => {
                this.subject.next(peer);
                this.restrictUuid(peer.uuid);
            });

        this.peer.onClose
            .first()
            .subscribe(peer => {
                this.subject.complete(peer);
                this.releaseUuid(peer.uuid);
            });
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



const onOpen = curry((handle, connection) => {
    connection.onOpen
        .pipe(first())
        .subscribe(handle);

    return connection;
});

const onClose = curry((handle, connection) => {
    connection.onClose
        .pipe(first())
        .subscribe(handle);

    return connection;
});

const onOpenHandle = (connection) => {
    this.subject.next(peer);
    this.restrictUuid(peer.uuid);
};

const onCloseHandle = (connection) => {
    this.subject.complete(peer);
    this.releaseUuid(peer.uuid);
};

const createPeerConnection = curry((type, localUuid) => {
    return compose(
        onClose(onCloseHandle),
        onOpen(onOpenHandle),
        createConnection(type)
    )(localUuid);
});


const createPeer = curry((type, localUuid, restrictedUuids) => {
    return compose(
        assoc('restrictedUuids', restrictedUuids),
        createPeerConnection(type)
    )(localUuid);
});

const createRestrictedUuids = (initialUuids = []) => {
    return new BehaviorSubject(initialUuids);
};

// let peer = createPeerConnection(444);


console.log('X', createPeer('ask', 143, []));
