export default class LocalStorage {
    constructor() {
        this.key = 'actions';

        localStorage.setItem(this.key, '[]');
    }
    read (id) {
        let actions = JSON.parse(localStorage.getItem(this.key));
        return actions.find(action => action.id === id);
    }

    create (value) {
        let actions = [...JSON.parse(localStorage.getItem(this.key)), value];
        
        return localStorage.setItem(this.key, JSON.stringify(actions));
    }

    update (id, value) {
        let actions = JSON.parse(localStorage.getItem(this.key));
        let index = actions.findIndex(action => action.id === id);

        if (index === -1) {
            return this.create(value);
        }
        
        actions[index] = Object.assign({}, actions[index], value);
        return localStorage.setItem(this.key, JSON.stringify(actions));
    }

    delete (id) {
        let actions = JSON.parse(localStorage.getItem(this.key));

        actions = actions.filter(action => action.id !== id);
        return localStorage.setItem(this.key, JSON.stringify(actions));
    }
}