import PeerFactory from './PeerFactory';
import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

export default class Peers {
    constructor (local) {
        this.subject = new Subject();
        this.message = new Subject();
        this.overview = new ReplaySubject(1);
        this.local = local;
        this.pool = new BehaviorSubject([]);
        this.peerFactory = new PeerFactory();
        this.restrictedMessages = [];

        this.PEERS_LIMIT = 3;
    }
    init () {
        this.message.subscribe(data => {
            if (data.type === 'overview') {
                console.log('new overview', data);
                this.overview.next(data.message);
            }
        });

        this.local.socket.on('overview', overview => {
            this.overview.next(overview);
            console.log(overview);
			this.broadcast('overview', overview);
        });

        this.createPeer('ask');
        this.createPeer('offer');
    }

    createPeer (peerType) {
        let peer = this.peerFactory.create(peerType, this.local, this.pool);

        let subscription = peer.subject.subscribe(peer => {
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

            this.createPeer(peerType);
        });

        peer.subject.last().subscribe(peer => {
            this.pool.next([...this.pool.value.filter(item => item.id !== peer.id)]);
            subscription.unsubscribe();
        });

        peer.init();
    }

    broadcast (type, message, id = Date.now() + this.local.uuid) {
        this.pool.value
            .forEach(peer => {
                peer.broadcast(type, message, id);
            });
    }

};
