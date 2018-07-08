import React from 'react';
import Local from './Local';
import Socket from './Socket';
import Peers, { createPeers, initPeers, send, broadcast } from '../peer/Peers';
import { Subject, BehaviorSubject } from 'rxjs';

import { Observable } from 'rxjs/Observable';
import { zip } from 'rxjs/observable/zip';
import { switchMap } from 'rxjs/operators';
import { createStore, compose } from '../../../../../Library/Caches/typescript/2.9/node_modules/redux';

export const withStore = (store) => (Component, LoadingComponent) => {
	store.init();

	return class extends React.Component {
		constructor(props) {
			super(props);

			this.state = {
				storeReady: false
			};

			store.ready.subscribe((peers) => {
				this.setState({
					storeReady: peers.length > 0
				});
			});
		}

		render() {
			if (!this.state.storeReady && LoadingComponent) {
				return <LoadingComponent {...this.props} />;
			}

			return <Component p2pStore={store} {...this.props} />
		}
	}
}


const bootstrapStore = curry((driver, url) => {
	return {
		ready: createReady(),
		db: driver,
		socket: new Socket(url),
		local: createLocal(),
		peers: cratePeers()
	}
});
export const getStore = curr((url, driver) => {
	return compose(
		initStore,
		bootstrapStore(driver)
	)(url);
});
