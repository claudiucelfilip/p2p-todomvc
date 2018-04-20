import { Subject } from 'rxjs/Subject';

export default Worker = {};

Worker.init = () => {
    let subject = new Subject();
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(service => {
                console.log('ServiceWorker registration successfull');
                subject.next(service);
            }, err => {
                console.log('ServiceWorker registration failed', err);
                subject.error(err);
            });
    });
    return subject;
}


// peers.latest
//     .withLatestFrom(service)
//     .subscribe(([peer, service]) => {
//         // serviceMessage('newPeer', peer.uuid);

//         peer.on('fetched', (message) => {
//             const data = message.data;
//             console.log('RESPONSE', data);
//             serviceMessage('fetchedResponse', data);
//         });

//         var responses = {};
//         peer.on('chunk', (message) => {
//             const data = message.data;
//             console.log('RESPONSE', data);
//             serviceMessage('chunkResponse', data);
//         });

//         // peer.on('request', (request) => {
//         //     let headers = new Headers();
//         //     headers.append('X-Peer-Fetch', 'true');
//         //     fetch(request.url, { headers })
//         //         .then(response => response.arrayBuffer())
//         //         .then(blob => {
//         //             peer.send('response', {
//         //                 blob
//         //             });
//         //         });
//         // });

//         // peer.on('response', (data) => {
//         //     console.log('response', data);
//         //     serviceMessage('response', {
//         //         url,
//         //         blob: new Blob([new Uint8Array(data)])
//         //     });
//         // });

//     });

// function serviceMessage(type, data) {
//     navigator.serviceWorker.controller.postMessage({
//         type,
//         data
//     });
// }

// function addImages() {
//     // setTimeout(() => {
//     //     let img = document.createElement('img');
//     //     img.src = '/tortoise.png';
//     //     document.body.appendChild(img);
//     // }, 4000);

//     // setTimeout(() => {
//     //     let img = document.createElement('img');
//     //     img.src = '/image.svg';
//     //     document.body.appendChild(img);
//     // }, 4000);


//     // setTimeout(() => {
//     //     let img = document.createElement('img');
//     //     img.src = '/image.gif';
//     //     document.body.appendChild(img);
//     // }, 4000);

//     setTimeout(() => {
//         let img = document.createElement('img');
//         img.src = '/people.jpeg';
//         document.body.appendChild(img);
//     }, 4000);

//     // setTimeout(() => {
//     //     let img = document.createElement('img');
//     //     img.src = '/image.png';
//     //     document.body.appendChild(img);
//     // }, 4000);

//     setTimeout(() => {
//         let img = document.createElement('img');
//         img.src = 'https://www.w3schools.com/css/trolltunga.jpg';
//         document.body.appendChild(img);
//     }, 4000);
// }