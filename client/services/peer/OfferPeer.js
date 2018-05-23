import Connection from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import Peer from './Peer';

export default class OfferPeer extends Peer {
    constructor (...args) {
		super('offer', ...args);
    }

    init () {
        return this.offer()
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
            let handle = answer => {

				if (this.restrictedUuids.value.indexOf(answer.uuid) === -1) {
					console.log('received answer', answer);
					this.peer.uuid = answer.uuid;
					// this.restrictUuid(this.peer.uuid);
					this.local.socket.off('answer', handle);
					resolve(answer);
				}
			};
//
			this.local.socket.on('answer', handle);
        });
    }

    connect = (answer) => {
        return this.peer.connection
            .setRemoteDescription(new RTCSessionDescription(answer.desc))
            .then(() => {
                return this.peer.connection.addIceCandidate(
                    new RTCIceCandidate(answer.ice)
                );
			});
    }

    sendOffer = ([desc, ice]) => {
		let offer = {
            uuid: this.local.uuid,
            desc,
            ice,
            id: this.peer.id
		};

        console.log('offer sent', offer);
        this.local.socket.send('sendOffer', offer);
    }
}
