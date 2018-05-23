import Connection from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import Peer from './Peer';

export default class AskPeer extends Peer {
    constructor (...args) {
        super('ask', ...args);
    }

    init (targets) {
        return this.ask(targets)
            .then(this.answer)
			.then(this.sendAnswer)
			.catch(this.errorHandler);
    }

    ask = (targetUuids) => {
        this.local.socket.send('requestOffer', {
			uuid: this.local.uuid,
			restrictedUuids: this.restrictedUuids.value,
			targetUuids
        });
        return new Promise((resolve, reject) => {
            let handle = offer => {

                if (this.restrictedUuids.value.indexOf(offer.uuid) === -1) {
					console.log('received offer', offer);
					this.local.socket.off('offer', handle);
					// this.restrictUuid(offer.uuid);
                    resolve(offer);
                } else {
                    this.local.socket.send('sendOffer', offer);
                }
            };

            this.local.socket.on('offer', handle);
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
			})
			.then(data => {
				this.local.socket.send('usedOffer', offer);
				return data;
			});

    }

    sendAnswer = ([desc, ice, offer]) => {
		let answer = {
            uuid: this.local.uuid,
            target: offer.uuid,
            desc,
            ice,
            offerId: offer.id,
            answerId: this.peer.id
        };
        console.log('answer sent', answer);
        this.local.socket.send('sendAnswer', answer);
    }
}
