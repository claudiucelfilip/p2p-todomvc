export const ADD_TODO = 'addTodo';
export function addTodo(payload) {
    return {
        type: ADD_TODO,
        payload
    };
}


export const ADD_TODOS = 'addTodos';
export function addTodos(payload) {
    return {
        type: ADD_TODOS,
        payload
    };
}

