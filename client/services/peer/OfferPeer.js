import Connection from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import Peer from './Peer';

export default class OfferPeer extends Peer {
    constructor (...args) {
        super('offer', ...args);
    }

    init () {
        this.offer()
            .then(this.sendOffer)
            .then(this.wait)
            .then(this.connect)
            .catch(this.errorHandler);
    }

    offer = () => {
        return this.peer.connection.createOffer()
            .then(desc => {
                let promiseDesc = this.peer.connection
                    .setLocalDescription(desc)
                    .then(() => desc);

                let promiseIce = this.peer.getIceCandidate();
                return Promise.all([promiseDesc, promiseIce]);
            });
    }

    wait = () => {
        return new Promise((resolve) => {
            this.local.socket.once('answer', answer => {
                console.log('received answer', answer);
                this.peer.uuid = answer.uuid;

                resolve(answer);
            });
        });
    }

    connect = (answer) => {
        // if (!answer.desc || answer.uuid === this.local.uuid) {
        //     return;
        // }

        return this.peer.connection
            .setRemoteDescription(new RTCSessionDescription(answer.desc))
            .then(() => {
                return this.peer.connection.addIceCandidate(
                    new RTCIceCandidate(answer.ice)
                );
            });
    }

    sendOffer = ([desc, ice]) => {
        console.log('offer sent', desc, ice);
        this.local.socket.send('sendOffer', {
            uuid: this.local.uuid,
            desc,
            ice,
            id: this.peer.id
        });
    }
}
