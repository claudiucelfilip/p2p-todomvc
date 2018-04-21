import { ReplaySubject } from 'rxjs/ReplaySubject';

export default class Worker {
    constructor() {
        this.subject = new ReplaySubject(1);
    }
    init () {
        
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(service => {
                    console.log('ServiceWorker registration successfull');
                    this.subject.next(service);
                }, err => {
                    console.log('ServiceWorker registration failed', err);
                    this.subject.error(err);
                });
        });

    }
}