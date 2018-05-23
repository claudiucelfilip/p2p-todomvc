import OfferPeer from './OfferPeer';
import AskPeer from './AskPeer';

export default class PeerFactory {
    create (peerType, ...args) {
        switch (peerType) {
            case 'offer':
                return new OfferPeer(...args);
            case 'ask':
                return new AskPeer(...args);
        }
    }
}
