let peerUuids = [];
let handlers = {};

self.addEventListener('install', (event) => {
    addMessageHandler('newPeer', (uuid) => {
        peerUuids.push(uuid);
    });

    addMessageHandler('lostPeer', (lostUuid) => {
        peerUuids.filter(uuid => uuid !== lostUuid);
    });
});

function getHeaders(entries) {
    let headers = {};
    for (let entry of entries) {
        headers[entry[0]] = entry[1];
    }
    return headers;
}

var base64ToBlob = function(base64, cb) {
    return new Promise(resolve => {
        var binary = atob(base64);
        var len = binary.length;
        var buffer = new ArrayBuffer(len);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < len; i++) {
            view[i] = binary.charCodeAt(i);
        }
        resolve(new Blob([view]));
    });
};

var blobToBase64 = function(blob) {
    return new Promise(resolve => {
        var reader = new FileReader();
        reader.onload = function() {
            var dataUrl = reader.result;
            var base64 = dataUrl.split(',')[1];
            resolve(base64);
        };
        reader.readAsDataURL(blob);
    });
};


let chunks = {};
addMessageHandler('chunkResponse', data => {
    chunks[data.messageId] = chunks[data.messageId] || [];
    chunks[data.messageId] = chunks[data.messageId].concat(data.chunk);
});
addMessageHandler('fetchedResponse', data => {
    let chunk = chunks[data.messageId];
    if (chunk) {

        caches.open('v1').then(function(cache) {

            let buff = new Uint8Array(chunk);
            let blob = new Blob([buff], { type: data.blobType || data.headers['content-type'] });
            let response = new Response(blob, {
                header: data.header
            });

            cache.put(data.url, response);
            delete chunks[data.messageId];
        });
    }
});

function sendPayload(client, request) {
    var data = new Uint8Array(request.body);
    var frameSize = 1024 * 8;
    var bufferLength = request.body.byteLength;
    var messageId = Math.floor(Math.random() * 100000);

    return new Promise(resolve => {
        for (var i = 0; i < bufferLength / frameSize; i++) {
            client.postMessage({
                type: 'chunk',
                messageId,
                chunk: Array.from(data.slice(i * frameSize, i * frameSize + frameSize))
            });
        }
        client.postMessage({
            type: 'fetched',
            messageId,
            url: request.url,
            headers: request.headers,
        });
    });
}


self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.open('v1').then(function(cache) {
            return caches.match(event.request)
                .then(function(response) {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request)
                        .then((response) => {
                            let clonedResponse = response.clone();
                            if (/^chrome-extension/.test(event.request.url) === false) {
                                // cache.put(event.request.url, clonedResponse);
                            }

                            return [response, clonedResponse];
                        })
                        .then(async([response, clonedResponse]) => {
                            if (event.clientId && event.request.url) {
                                const client = await clients.get(event.clientId);
                                const body = await response.clone().arrayBuffer();
                                const blob = await response.clone().blob();

                                if (client && body.byteLength) {
                                    sendPayload(client, {
                                        url: event.request.url,
                                        headers: getHeaders(response.headers.entries()),
                                        body,
                                        blobType: blob.type
                                    });
                                }
                            }
                            return response;
                        });
                })


        })
        .catch(function(err) {
            // If both fail, show a generic fallback:
            // return caches.match('/offline.html');
            console.log(err);
        })
    );
});

self.addEventListener('activate', function(event) {
    console.log('SW Reactivated');
});



function addMessageHandler(type, fn) {
    handlers[type] = handlers[type] || [];
    handlers[type].push(fn);
}
self.addEventListener('message', function(event) {
    var message = event.data;
    var handlerType = handlers[message.type] || [];

    handlerType.forEach(handler => handler(message.data));
});