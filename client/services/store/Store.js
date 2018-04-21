import React from 'react';
import Local from './Local';
import Socket from './Socket';
import Peers from './Peers';
import { Subject } from 'rxjs';
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

            store.subject.subscribe(() => {
                this.setState({
                    storeReady: true
                });
            });
        }

        render () {
            if (!this.state.storeReady) return <LoadingComponent {...this.props} />;
            return <Component store={store} {...this.props} />
        }
    }
}

export default class Store {
    constructor (url) {
        this.subject = new Subject();

        this.socket = new Socket(url);
        this.local = new Local(this.socket);
        this.peers = new Peers(this.local);
        this.ready = false;

        this.subject = Observable
            .zip(
                this.local.subject,
                this.socket.subject
            )
            .switchMap(() => {
                this.peers.init();
                return this.peers.subject;
            });
    }

    init () {
        this.socket.init();
        this.local.init();
    }
}