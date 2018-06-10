import React from 'react';
import Monitor from '../../components/Monitor/Monitor';
import { addTodo, ADD_TODO, addTodos, ADD_TODOS } from '../../actions/todos';
import { connect } from 'react-redux';
import 'rxjs/add/operator/filter';

class Home extends React.Component {
	constructor(...args) {
		super(...args);

		this.state = {
			message: ''
		};
//
		let messages = this.props.p2pStore.peers.message.filter(data => data.type === 'action');

		let addTodosRelay = messages
			.filter(data => data.message.type === ADD_TODOS)
			.first()
			.subscribe(data => {
				this.props.dispatch(data.message);
			});

		let genericRelay = messages
			.filter(data => data.message.type !== ADD_TODOS)
			.subscribe(data => {
				this.props.dispatch(data.message);
			});

		let initialAddTodosRelay = this.props.p2pStore.peers.subject
			.subscribe(peer => {
				this.props.p2pStore.send(peer, 'action', addTodos(this.props.todos));
			});

		this.subscriptions = [addTodosRelay, genericRelay, initialAddTodosRelay];

	}
	componentWillUnmount() {
		this.subscriptions.forEach(subscription => subscription.unsubscribe());
	}
	onNewTodo = (event) => {
		if (event.key === 'Enter') {
			let todo = {
				text: event.target.value
			}

			this.props.p2pStore.action(addTodo(todo));
		}
	}
	render() {
		return <div className="home-container">
			<Monitor peers={this.props.p2pStore.peers} uuid={this.props.p2pStore.local.uuid} />
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
