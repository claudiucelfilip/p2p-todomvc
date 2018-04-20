import React from 'react';
import 'todomvc-common/base.css';
import 'todomvc-app-css';
import 'app.css';
import Worker from './services/worker/Worker'


var worker = Worker.init();
worker.subscribe(() => {
	// addImages();
	console.log('Worker works');
	navigator.serviceWorker.addEventListener('message', event => {
		// let message = event.data;
		// peers.broadcast(message.type, message);
	});
});
export default () => {
	return <div>Hello World!</div>
};
