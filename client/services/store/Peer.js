import Connection from './Connection';
import { ReplaySubject } from 'rxjs/ReplaySubject';

export default class Peer {
    constructor(peerType, uuid) {
        this.peer = new Connection(peerType, uuid);
        this.subject = new ReplaySubject(1);
    }

    makeOffer() {
        this.peer.connection.createOffer()
            .then(desc => {
                let promiseDesc = this.peer.connection
                    .setLocalDescription(desc)
                    .then(() => desc);

                let promiseIce = this.peer.getIceCandidate();
                Promise.all([promiseDesc, promiseIce])
                    .then(([desc, ice]) => {
                        this.desc = desc;
                        this.ice = ice;
                        this.sendOffer();
                    });
            })
    }

    sendOffer([desc, ice]) {
        console.log(desc, ice);
        local.socket.send('sendOffer', {
            uuid: this.local.uuid,
            desc,
            ice,
            id: this.peer.id
        });
    }
}