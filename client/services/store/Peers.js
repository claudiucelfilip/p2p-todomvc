import PeerFactory from './PeerFactory';
import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

export default class Peers {
    constructor (local) {
        this.subject = new ReplaySubject(1);
        this.local = local;
        this.pool = new BehaviorSubject([]);
        this.peerFactory = new PeerFactory();

        this.PEERS_LIMIT = 3;
    }

    init () {
        let peer1 = this.createPeer('offer');
        let peer2 = this.createPeer('ask');

        peer1.init();
        setTimeout(() => {
            peer2.init();
        }, 3000);
        
        
        this.pool
            .filter(pool => pool.length)
            .first()
            .subscribe((pool) => {
                this.subject.next(pool);
            });
    }

    createPeer (peerType) {
        let peer = this.peerFactory.create(peerType, this.local);
        peer.subject.subscribe(peer => {
            this.pool.next([...this.pool.value, peer]);
        });
        return peer;
    }
};
