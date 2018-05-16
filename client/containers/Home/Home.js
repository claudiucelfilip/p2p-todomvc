import React from 'react';
import Monitor from '../../components/Monitor/Monitor';
import { addTodo, ADD_TODO, addTodos, ADD_TODOS } from '../../actions/todos';
import { connect } from 'react-redux';
import 'rxjs/add/operator/filter';

class Home extends React.Component {
    constructor (...args) {
        super(...args);

        this.state = {
            message: ''
        };

        let messages = this.props.p2pStore.peers.message.filter(data => data.type === 'action');

        messages
            .filter(data => data.message.type === ADD_TODOS)
            .take(1)
            .subscribe(data => {
                this.props.dispatch(data.message);
            });

        messages
            .filter(data => data.message.type !== ADD_TODOS)
            .subscribe(data => {
                this.props.dispatch(data.message);
            });

        this.props.p2pStore.peers.subject.subscribe(peer => {
            peer.send('action', addTodos(this.props.todos));
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
        return <div className="home-container">
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
            <Monitor peers={this.props.p2pStore.peers.pool}/>
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
