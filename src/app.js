import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import Loader from './containers/Loader';
import Home from './containers/Home';

import 'todomvc-common/base';
import 'todomvc-common/base.css';
import 'todomvc-app-css';

import 'app.css';

export default () => {
	return <BrowserRouter>
		<div>
			<Route exact path="/" component={Loader} />
			<Route path="/home" component={Home} />
		</div>
	</BrowserRouter>
};
