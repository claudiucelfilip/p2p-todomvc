import Peer from './Peer';
import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

export default class Peers {
    constructor(local) {
        this.subject = new ReplaySubject(1);
        this.local = local;
        this.pool = new BehaviorSubject([]);

        this.PEERS_LIMIT = 3;
    }

    init() {         
        this.pool.next([
            ...this.pool.value, 
            this.createOfferPeer(),
            this.createAskPeer()
        ]);

        this.pool.subscribe((pool) => {
            this.subject.next(pool);
        });
    }

    createOfferPeer() {
        return new Peer('offer', this.local.uuid);
    }

    createAskPeer() {
        return new Peer('ask', this.local.uuid);
    }
};
