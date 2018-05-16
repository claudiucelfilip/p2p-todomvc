import Connection from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import Peer from './Peer';

export default class AskPeer extends Peer {
    constructor (...args) {
        super('ask', ...args);
    }

    init () {
        this.ask()
            .then(this.answer)
            .then(this.sendAnswer)
            .catch(this.errorHandler);
    }

    ask = () => {
        let intv = new Subject();

        Observable.interval(3000)
            .takeUntil(intv)
            .subscribe(() => {
                console.log('asking for offer');
                this.local.socket.send('requestOffer');
            });

        return new Promise(resolve => {
            this.local.socket.on('offer', offer => {
                let pool = this.restrictedPool.value;
                let restrictedUuids = pool.map(peer => peer.uuid);

                if (offer && restrictedUuids.indexOf(offer.uuid) === -1) {
                    resolve(offer);
                    intv.next(true);
                }
            });
        });
    }

    answer = (offer) => {
        this.peer.uuid = offer.uuid;

        return this.peer.connection
            .setRemoteDescription(new RTCSessionDescription(offer.desc))
            .then(() => this.peer.connection.createAnswer())
            .then(desc => {
                let promiseDesc = this.peer.connection
                    .setLocalDescription(desc)
                    .then(() => desc);

                let promiseIce = this.peer.getIceCandidate();
                return Promise.all([promiseDesc, promiseIce]);
            })
            .then(([desc, ice]) => {
                return this.peer.connection
                    .addIceCandidate(new RTCIceCandidate(ice))
                    .then(() => [desc, ice, offer]);
            });

    }

    sendAnswer = ([desc, ice, offer]) => {
        console.log('answer sent', desc, ice);
        this.local.socket.send('sendAnswer', {
            uuid: this.local.uuid,
            target: offer.uuid,
            desc,
            ice,
            offerId: offer.id,
            answerId: this.peer.id
        });
    }
}
