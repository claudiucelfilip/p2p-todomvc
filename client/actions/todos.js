export const ADD_TODO = 'addTodo';
export function addTodo(payload) {
    return {
        type: ADD_TODO,
        payload
    };
}

