import todosReducer from './todos';
import { combineReducers } from 'redux';

export default combineReducers({
    todos: todosReducer
});