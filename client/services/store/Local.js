// import Peers from './Peers';
// import Socket from './Socket';
import { Subject } from 'rxjs/Subject';

export default class Local {
    constructor (socket) {
        this.subject = new Subject();
        this.socket = socket;
        this.uuid = Math.floor(Math.random() * 10000);
        this.peerUuids = [];
    }

    init() {
        this.socket.subject.subscribe(() => {
            this.socket.send('peer', {
                uuid: this.uuid
            });

            this.subject.next({
                uuid: this.uuid,
                peerUuids: this.peerUuids
            });
        })
    }
};
