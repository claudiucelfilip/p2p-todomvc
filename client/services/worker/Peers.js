import Connection from './Connection';
export default Peers = {};

function subscribePeers(peersSubject) {
    return peersSubject.next.bind(peersSubject);
}

function reduce(store, action) {
    switch (action.type) {
        case 'add':
            return store.concat(action.peer);
        case 'remove':
            return store.filter(item => item.uuid !== action.peer.uuid);
        default:
            return store;
    }
}

function addPeerAction(peer) {
    return {
        type: 'add',
        peer
    };
}

function removePeerAction(peer) {
    return {
        type: 'remove',
        peer
    };
}

Peers.offer = local => {
    let subject = new Rx.Subject();
    let offer = new Connection('offer', local.uuid);

    let promise = offer.connection
        .createOffer()
        .then(desc => {
            let promiseDesc = offer.connection
                .setLocalDescription(desc)
                .then(() => desc);
            let promiseIce = offer.getIceCandidate();
            return Promise.all([promiseDesc, promiseIce]);
        })
        .then(([desc, ice]) => {
            console.log('offer sent', desc, ice);
            local.socket.send('sendOffer', {
                uuid: local.uuid,
                desc,
                ice,
                id: offer.id
            });

            subject.next([local, offer]);
        })
        .catch(err => {
            console.log(err);
            subject.error(err);
        });

    return subject;
};

Peers.wait = ([local, offer]) => {
    let subject = new Rx.Subject();

    local.socket.once('answer', answer => {
        console.log('received answer', answer);
        offer.uuid = answer.uuid;
        subject.next([local, offer, answer]);
    });

    return subject;
};

Peers.connect = ([local, offer, answer]) => {
    if (!answer.desc || answer.uuid === local.uuid) {
        return;
    }

    let subject = new Rx.Subject();

    offer.connection
        .setRemoteDescription(new RTCSessionDescription(answer.desc))
        .then(() => {
            return offer.connection.addIceCandidate(
                new RTCIceCandidate(answer.ice)
            );
        })
        .then(() => {
            offer.onOpen.subscribe(peer => {
                subject.next(peer);
            });
        })

    return subject;
};
Peers.listen = local => {
    let subject = new Rx.Subject();
    local.socket.on('newOffer', offer => {
        if (offer) {
            subject.next(offer);
        }
    });
    return subject;
};
Peers.ask = local => {
    let subject = new Rx.Subject();
    local.socket.send('requestOffer');

    let handleOffer = offer => {
        if (offer) {
            subject.next(offer);
        }
    };

    local.socket.on('offer', handleOffer);

    return subject;
};

Peers.answer = (local, offer) => {
    let answer = new Connection('ask', local.uuid);
    let subject = new Rx.Subject();

    answer.uuid = offer.uuid;
    let promise = answer.connection
        .setRemoteDescription(new RTCSessionDescription(offer.desc))
        .then(() => answer.connection.createAnswer())
        .then(desc => {
            let promiseDesc = answer.connection
                .setLocalDescription(desc)
                .then(() => desc);
            let promiseIce = answer.getIceCandidate();
            return Promise.all([promiseDesc, promiseIce]);
        })
        .then(([desc, ice]) => {
            return answer.connection
                .addIceCandidate(new RTCIceCandidate(ice))
                .then(() => [desc, ice]);
        })
        .then(([desc, ice]) => {
            console.log('answer sent', desc, ice);
            local.socket.send('sendAnswer', {
                uuid: local.uuid,
                target: offer.uuid,
                desc,
                ice,
                offerId: offer.id,
                answerId: answer.id
            });
        })
        .then(() => {
            answer.onOpen.subscribe(peer => {
                subject.next(peer);
            });
        });

    return subject;
};

Peers.create = $local => {
    let $pool = new Rx.BehaviorSubject([]);
    let pool = $pool.scan(reduce, []);

    let peers;

    pool.subscribe(items => peers = items);

    let $latest = new Rx.Subject();
    $local.flatMap(local => createPairPeer(local, pool))
        .subscribe(peer => {
            $latest.next(peer);
        }, err => {
            console.error(err);
        });

    let broadcast = (type, payload, target, uuids) => {
        peers.forEach(peer => {
            peer.broadcast(type, payload, target, uuids);
        });
    };

    let on = (type, handler) => {
        peers.forEach(peer => {
            peer.on(type, handler);
        });
    }

    $latest.subscribe(peer => {
        peer.onClose.subscribe((peer) => {
            $pool.next(removePeerAction(peer));
        });

        $pool.next(addPeerAction(peer));
    });

    return {
        latest: $latest,
        pool,
        broadcast,
        on
    };
};

function createPairPeer(local, $pool) {
    return Rx.Observable.merge(
        createOffer(local, $pool),
        createAsk(local, $pool)
    );
}

function createOffer(local, $pool) {
    let resend = new Rx.Subject()
        .flatMap(Peers.offer);

    return Rx.Observable
        .merge(Peers.offer(local), resend)
        .flatMap(Peers.wait)
        .withLatestFrom($pool)
        .filter(([
                [local, offer, answer], pool
            ]) =>
            peerLimitFilter([answer, pool])
        )
        .map(([data, pool]) => data)
        .flatMap((data) => {
            return Peers.connect(data);
        })
        .do(peer => {
            peer.onClose.subscribe(() => {
                Rx.Observable.timer(2000)
                    .subscribe(() => {
                        resend.next(local);
                    });
            });
        })
        .catch(err => {
            console.error(err);
        });
}

function createAsk(local, $pool) {
    let listen = Rx.Observable.timer(3000)
        .map(() => local)
        .flatMap(Peers.listen)
        .withLatestFrom($pool)
        .filter(peerLimitFilter)
        .subscribe(offer => {
            local.socket.send('requestOffer', {
                id: offer.id
            });
        }, err => {
            console.error(err);
        });

    return Peers.ask(local)
        .withLatestFrom($pool)
        .filter(peerLimitFilter)
        .flatMap(([offer, pool]) => {
            return Peers.answer(local, offer);
        })
        .catch(err => {
            console.error(err);
        });
}

const LIMIT = 3;

function peerLimitFilter([offer, peers]) {
    return (
        peers.length < LIMIT &&
        peers.findIndex(peer => peer.uuid === offer.uuid) === -1
    );
}