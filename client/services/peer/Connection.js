import { Subject } from 'rxjs/Subject'
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/zip';
import 'rxjs/add/operator/map';
import { curry } from 'ramda';

export default class Connection {
	constructor(type, local) {
		this.initConfig();
		this.local = local;
		this.type = type;
		this.id = Math.floor(Math.random() * 100000);
		this.handlers = {};

		this.connection = new RTCPeerConnection(this.config);

		// this.onOpen = Observable.zip(
		//     this.onSendChannelOpen(),
		//     this.onReceiveChannelOpen()
		// ).map(([sendChannel, receiveChannel]) => {
		//     return this;
		// });
		this.onOpen = Promise.all([
			this.onSendChannelOpen(),
			this.onReceiveChannelOpen()
		]).then(() => this);

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
		// let subject = new Subject();
		return new Promise((resolve) => {
			this.sendChannel.onclose = () => {
				console.log(
					'send datachannel closed',
					this.sendChannel.readyState
				);
				resolve(this);
			};
		});

		// return subject;
	}

	onSendChannelOpen() {
		// let subject = new Subject();
		this.sendChannel = this.connection.createDataChannel(
			`channel ${Math.random()}`
		);

		return new Promise((resolve, reject) => {
			this.sendChannel.onerror = err => {
				reject(err);
			};

			this.sendChannel.onopen = () => {
				console.log(
					'send datachannel opened',
					this.sendChannel.readyState
				);
				resolve(this.sendChannel);
			};
		})
		// return subject;
	}

	onMessage(message) {
		let payload;

		try {
			payload = JSON.parse(message.data);
		} catch (e) {
			payload = message.data;
		}
		let type = payload.type || 'response';

		let handlers = this.handlers[type] || [];
		[...handlers, this.defaultHandler].forEach(handler => {
			handler(payload);
		});
	}

	onReceiveChannelOpen() {
		// let subject = new Subject();

		return new Promise(resolve => {
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
					resolve(this.receiveChannel);
				};

				this.receiveChannel.onclose = () => {
					console.log(
						'receive datachannel closed',
						this.receiveChannel.readyState
					);
					this.sendChannel.close();
				};
			};
		});

		// return subject
	}

	on(type, handler) {
		if (typeof type === 'function') {
			this.defaultHandler = type;
			return;
		}
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

	send(type, message, broadcast = false, id = Date.now()) {
		let data = {
			type,
			message,
			id,
			broadcast: broadcast || false,
			source: this.local.uuid,
			target: this.uuid
		};

		console.log('Sending to', data.target);
		if (type === 'response') {
			return this.sendChannel.send(data.blob);
		}
		if (typeof data !== 'string') {
			data = JSON.stringify(data);
		}
		if (this.sendChannel.readyState === 'open') {
			this.sendChannel.send(data);
		}
	}

	broadcast(type, message, id = Date.now()) {
		this.send(type, message, true, id);
	}
}

export const createConnection = curry((type, uuid) => new Connection(type, uuid));
