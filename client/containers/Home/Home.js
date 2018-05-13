import React from 'react';
import { addTodo, ADD_TODO } from '../../actions/todos';
import { connect } from 'react-redux';

class Home extends React.Component {
    constructor (...args) {
        super(...args);

        this.state = {
            message: ''
        };
        
        this.props.p2pStore.peers.message.subscribe(data => {
            if (data.type === 'action') {
                this.props.dispatch(data.message);
            }
        });
    }
    onChange = (event) => {
        let store = this.props.p2pStore;
        let message = event.target.value;
        store.broadcast('ping', message);
        this.setState({
            message
        });
    }

    onNewTodo = (event) => {
        if (event.key === 'Enter') {
            let todo = {
                text: event.target.value
            }

            this.props.p2pStore.action(addTodo(todo));
            this.props.addTodo(todo);
        }
    }
    render () {
        return <div>
            <h1>Hello Home</h1>
            <input type="text" onChange={this.onChange} />
            <p>{this.state.message}</p>
            <section className="todoapp">
                <header className="header">
                    <h1>todos</h1>
                    <input className="new-todo" placeholder="What needs to be done?" autoFocus onKeyPress={this.onNewTodo} />
                </header>
                <section className="main">
                    <input id="toggle-all" className="toggle-all" type="checkbox" />
                    <label htmlFor="toggle-all">Mark all as complete</label>
                    <ul className="todo-list">
                        {this.props.todos.map((todo, index) => {
                            return <li key={index}>
                                <div className="view">
                                    <input className="toggle" type="checkbox" />
                                    <label>{todo.text}</label>
                                    <button className="destroy"></button>
                                </div>
                                <input className="edit" defaultValue={todo.text} />
                            </li>
                        })}
                        <li className="completed">
                            <div className="view">
                                <input className="toggle" type="checkbox" defaultChecked />
                                <label>Taste JavaScript</label>
                                <button className="destroy"></button>
                            </div>
                            <input className="edit" defaultValue="Create a TodoMVC template" />
                        </li>
                        
                    </ul>
                </section>
            </section>
        </div>;
    }

}

let mapStateToProps = state => {
    return {
        todos: state.todos
    }
}

let mapDispatchToProps = dispatch => {
    return {
        addTodo: payload => {
            dispatch(addTodo(payload));
        },
        dispatch
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);