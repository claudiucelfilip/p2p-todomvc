import OfferPeer from './OfferPeer';
import AskPeer from './AskPeer';

export default class PeerFactory {
    create (peerType, local) {
        switch (peerType) {
            case 'offer':
                return new OfferPeer(local);
            case 'ask':
                return new AskPeer(local);
        }
    }
}