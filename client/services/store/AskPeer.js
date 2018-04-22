import Connection from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import Peer from './Peer';

export default class AskPeer extends Peer {
    constructor (local) {
        super('ask', local);
    }

    init () {
        this.ask()
            .then(this.answer)
            .then(this.sendAnswer)
            .catch(this.errorHandler);
    }

    ask = () => {
        console.log('asking for offer');
        this.local.socket.send('requestOffer');

        return new Promise(resolve => {
            this.local.socket.on('offer', offer => {
                if (offer) {
                    resolve(offer);
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