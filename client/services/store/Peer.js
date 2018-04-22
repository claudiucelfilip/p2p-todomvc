import Connection from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';

export default class Peer {
    constructor (peerType, local) {
        this.local = local;
        this.peer = new Connection(peerType, local.uuid);
        this.subject = new ReplaySubject(1);

        this.peer.onOpen.subscribe(peer => {
            this.subject.next(peer);
        });
    }

    errorHandler = (err) => {
        this.subject.error(err);
    }
}