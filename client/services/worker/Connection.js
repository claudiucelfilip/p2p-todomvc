export default class Connection {
    constructor(type, localUuid) {
        this.initConfig();
        this.localUuid = localUuid;
        this.type = type;
        this.id = Math.floor(Math.random() * 100000);
        this.handlers = {};

        this.connection = new RTCPeerConnection(this.config);

        this.onOpen = Rx.Observable.zip(
            this.onSendChannelOpen(),
            this.onReceiveChannelOpen()
        ).map(([sendChannel, receiveChannel]) => {
            return this;
        });

        this.onClose = this.onChannelClose();
    }

    initConfig() {
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                    urls: 'turn:192.158.29.39:3478?transport=tcp',
                    credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                    username: '28224511:1379330808'
                }
            ]
        };
    }
    getIceCandidate() {
        return new Promise((resolve, reject) => {
            this.connection.onicecandidate = event => {
                if (event.candidate !== null) {
                    resolve(event.candidate);
                }
            };
        });
    }

    onChannelClose() {
        let subject = new Rx.Subject();
        this.sendChannel.onclose = () => {
            console.log(
                'send datachannel closed',
                this.sendChannel.readyState
            );
            subject.next(this);
        };
        return subject;
    }
    onSendChannelOpen() {
        let subject = new Rx.Subject();
        this.sendChannel = this.connection.createDataChannel(
            `channel ${Math.random()}`
        );

        this.sendChannel.onerror = err => {
            console.log(err);
        };

        this.sendChannel.onopen = () => {
            console.log(
                'send datachannel opened',
                this.sendChannel.readyState
            );
            subject.next(this.sendChannel);
        };
        return subject;
    }

    onMessage(message) {
        let payload;
        try {
            payload = JSON.parse(message.data);
        } catch (e) {
            payload = message.data;
        }
        let type = payload.type || 'response';

        // console.log('received', payload, this.handlers);
        (this.handlers[type] || []).forEach(handler => {
            handler(payload);
        });
    }
    onReceiveChannelOpen() {
        let subject = new Rx.Subject();
        this.connection.ondatachannel = event => {
            this.receiveChannel = event.channel;
            this.receiveChannel.onmessage = this.onMessage.bind(this);

            window.onbeforeunload = () => {
                this.sendChannel.close();
                this.receiveChannel.close();
            };

            this.receiveChannel.onopen = () => {
                console.log(
                    'receive datachannel opened',
                    this.receiveChannel.readyState
                );
                subject.next(this.receiveChannel);
            };

            this.receiveChannel.onclose = () => {
                console.log(
                    'receive datachannel closed',
                    this.receiveChannel.readyState
                );
                this.sendChannel.close();
            };
        };
        return subject
    }

    on(type, handler) {
        this.handlers[type] = this.handlers[type] || [];
        this.handlers[type].push(handler);
        return this;
    }

    once(type, handler) {
        this.handlers[type] = this.handlers[type] || [];
        let handlerWrapper = message => {
            handler(message);
            this.off(type, handler);
        };
        this.handlers[type].push(handlerWrapper);
        return this;
    }

    off(type, handler) {
        this.handlers[type] = (this.handlers[type] || []).filter(
            item => item !== handler
        );
        return this;
    }

    send(type, data, target, uuids, broadcast) {
        let payload = {
            type,
            broadcast,
            target,
            sourceUuid: this.localUuid,
            nextUuid: this.uuid,
            uuids: [...(uuids || []), this.localUuid],
            data
        };
        console.log('Sending', payload.uuids);
        if (type === 'response') {
            return this.sendChannel.send(data.blob);
        }
        if (typeof payload !== 'string') {
            payload = JSON.stringify(payload);
        }
        if (this.sendChannel.readyState === 'open') {
            this.sendChannel.send(payload);
        }
    }

    broadcast(type, data, target, uuids) {
        this.send(type, data, target, uuids, true);
    }
}