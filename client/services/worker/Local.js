import Peers from './Peers';

var socket = new Socket('wss://local:8080');
export default Local = {};

Local.init = socket => {
    let subject = new Rx.ReplaySubject(1);
    var uuid = Math.floor(Math.random() * 10000);
    console.log('Local UUID', uuid);

    socket.onopen = () => {
        socket.send('peer', {
            uuid
        });
        subject.next({
            uuid,
            socket,
            peerUuids: []
        });
    };

    return subject;
};

let local = Local.init(socket);

export const peers = Peers.create(local);
let count = 1;
peers.latest.withLatestFrom(local).subscribe(([peer, localInfo]) => {
    console.log('LATEs', peer);
    peer.on('ping', payload => {

        if (payload.uuids.indexOf(localInfo.uuid) !== -1) {
            return;
        }
        console.log('Receiving', payload.uuids);
        peers.broadcast('ping', payload.data, null, payload.uuids);

    });
});
peers.pool
    .subscribe(items => {
        console.log('PEERs', items.map(peer => peer.uuid));
    });

// Rx.Observable.zip(
//         peers.pool.filter(items => items.length).first(),
//         getImage()
//     )
//     .subscribe(([peer, data]) => {
//         peers.broadcast('ping', data);
//     });

var base64ToBlob = function(base64, cb) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
    }
    cb(new Blob([view]));
};
var blobToBase64 = function(blob, cb) {
    var reader = new FileReader();
    reader.onload = function() {
        var dataUrl = reader.result;
        var base64 = dataUrl.split(',')[1];
        cb(base64);
    };
    reader.readAsDataURL(blob);
};

function getImage() {
    let subject = new Rx.Subject();
    let url = 'https://mdn.github.io/dom-examples/streams/simple-pump/tortoise.png';
    fetch(url)
        .then(response => response.blob())
        .then(data => {
            return new Promise(resolve => {
                blobToBase64(data, resolve);
            });
        })
        .then(data => {
            subject.next({
                url,
                data: data
            });
        });
    return subject;
}