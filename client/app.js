import React from 'react';
import 'todomvc-common/base.css';
import 'todomvc-app-css';
import 'app.css';
import Worker from './services/worker/Worker';
import Store, { withStore } from './services/store/Store';
import LocalStorage from './services/drivers/LocalStorage';
import Home from './containers/Home/Home';
import Loading from './containers/Loading/Loading';
import { devToolsEnhancer } from 'redux-devtools-extension';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import reducers from './reducers';


const driver = new LocalStorage();
const store = new Store('ws://localhost:8001', driver);
// const store = createStore('ws://localhost:8001', driver);
const worker = new Worker();

const reduxStore = createStore(reducers, devToolsEnhancer());


const App = (props) => {
	return <Provider store={reduxStore}>
		<Home p2pStore={props.p2pStore}/>
	</Provider>;
};

export default withStore(store)(App, Loading);
