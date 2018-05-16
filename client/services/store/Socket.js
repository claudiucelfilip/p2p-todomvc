import { Subject } from 'rxjs/Subject';

export default class Socket {
    constructor(url) {
        this.url = url;
        this.subject = new Subject(1);

        this.handlers = {};
    }

    init() {
        this.socket = new WebSocket(this.url);
        this.socket.onopen = () => {
            this.subject.next(this.socket);
        };

        this.socket.onmessage = (message) => {
            let payload = JSON.parse(message.data);

            (this.handlers[payload.type] || []).forEach((handler) => {
                handler(payload.data);
            });
        };
    }

    on(type, handler) {
        this.handlers[type] = this.handlers[type] || [];
        this.handlers[type].push(handler);
        return this;
    }

    once(type, handler) {
        this.handlers[type] = this.handlers[type] || [];
        let handlerWrapper = (message) => {
            handler(message);
            this.off(type, handlerWrapper);
        }
        this.handlers[type].push(handlerWrapper);
        return this;
    }

    off(type, handler) {
        this.handlers[type] = (this.handlers[type] || []).filter(item => item !== handler);
        return this;
    }

    send(type, data) {
        let message;
        message = JSON.stringify({
            type,
            data: data
        });
        this.socket.send(message);
    }
}