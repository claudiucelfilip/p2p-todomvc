import React from 'react';
import Local from './Local';
import Socket from './Socket';
import Peers from '../peer/Peers';
import { Subject, BehaviorSubject } from 'rxjs';

import { Observable } from 'rxjs/Observable';
import { zip } from 'rxjs/observable/zip';
import { switchMap } from 'rxjs/operators';

export const withStore = (store) => (Component, LoadingComponent) => {
	store.init();

    return class extends React.Component {
        constructor (props) {
            super(props);

            this.state = {
                storeReady: false
            };

            store.subject.subscribe((peers) => {
                this.setState({
                    storeReady: peers.length > 0
                });
            });
        }

        render () {
            if (!this.state.storeReady && LoadingComponent) {
                return <LoadingComponent {...this.props} />;
            }

            return <Component p2pStore={store} {...this.props} />
        }
    }
}

export default class Store {
    constructor (url, dbDriver) {
        this.subject = new Subject();
        this.db = dbDriver;
        this.socket = new Socket(url);
        this.local = new Local(this.socket);
        this.peers = new Peers(this.local);
        this.ready = false;
        this.previousOpId = null;

        this.subject = Observable
            .zip(
                this.local.subject,
                this.socket.subject
            )
            .switchMap(() => {
                this.peers.init();
                return this.peers.pool;
            });

        this.peers.message.subscribe(data => {
            if (data.type === 'op') {
                console.log('recieved', data);
                let operation = this[data.message.method];
                if (typeof operation === 'function') {
                    operation(data.message.payload, true);
                }
            }
        });
    }

    init () {
        this.socket.init();
        this.local.init();
    }

    broadcast = (...args) => {
        this.peers.broadcast(...args);
    }

    read = (...args) => {
        return this.db.read(...args);
    }

    action = (action) => {
        this.peers.broadcast('action', action);
    }

    create = (payload, skipBroadcast) => {
        let id = (new Date()).getTime();
        let action = {
            method: 'create',
            previousOpId: this.previousOpId,
            id,
            payload
        };


        this.db.create(action);

        if (skipBroadcast) {
            return;
        }

        this.peers.broadcast('op', action);
        this.previousOpId = id;
    }

    update = (payload, skipBroadcast) => {
        let id = (new Date()).getTime();
        let action = {
            method: 'update',
            previousOpId: this.previousOpId,
            id,
            payload
        };

        this.db.create(action);

        if (skipBroadcast) {
            return;
        }

        this.peers.broadcast('op', action);
        this.previousOpId = id;
    }

    delete = (payload) => {
        let id = (new Date()).getTime();
        let action = {
            method: 'delete',
            previousOpId: this.previousOpId,
            id,
            payload
        };

        this.db.create(action);

        if (skipBroadcast) {
            return;
        }

        this.peers.broadcast('op', action);
        this.previousOpId = id;
    }
}
