import React from 'react';
import 'todomvc-common/base.css';
import 'todomvc-app-css';
import 'app.css';
import Worker from './services/worker/Worker';
import Store, { withStore } from './services/store/Store';

import Home from './containers/Home/Home';

const store = new Store('ws://localhost:8001');
const worker = new Worker();

const App = (props) => {
	return <Home store={props.store} />;
};

const Loading = () => {
	return <h1>Loading</h1>;
};

export default withStore(store)(App, Loading);