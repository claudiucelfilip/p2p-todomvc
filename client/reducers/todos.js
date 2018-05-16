import { ADD_TODO, ADD_TODOS } from '../actions/todos';

export default (state = [], action) => {
    switch(action.type) {
        case ADD_TODO: 
            return [...state, action.payload];
        case ADD_TODOS: 
            return [...state, ...action.payload];
        default:
            return state;
    }
}