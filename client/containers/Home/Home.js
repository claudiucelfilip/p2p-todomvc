import React from 'react';

export default class Home extends React.Component {
    constructor(...args) {
        super(...args);
        
        this.state = {
            message: ''
        };

        this.props.store.peers.message.subscribe(payload => {
            this.setState({
                message: payload.message
            });
        });
    }
    onChange = (event) => {
        let store = this.props.store;
        let message = event.target.value;
        store.broadcast('ping', message);
        this.setState({
            message
        });
    }
    render() {
        return <section>
            <h1>Hello Home</h1>
            <input type="text" onChange={this.onChange}/>
            <p>{this.state.message}</p>
        </section>;
    }
    
}