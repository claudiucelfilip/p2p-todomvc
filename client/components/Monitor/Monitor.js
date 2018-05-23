import React from 'react';
import * as d3 from 'd3';

export default class Monitor extends React.Component {
	constructor(...args) {
		super(...args);
		this.state = {
			width: 1100,
			height: 550
		};
	}

	componentDidMount() {
		this.createNodes();
	}

	createNodes() {
		let nodes = [];
		let links = [];

		let svg = d3.select(this.node);

		let tick = (e) => {
			node.attr('cx', d => d.x)
				.attr('cy', d => d.y);

			link.attr('x1', d => d.source.x)
				.attr('y1', d => d.source.y)
				.attr('x2', d => d.target.x)
				.attr('y2', d => d.target.y);

			text.attr('dx', d => d.x)
				.attr('dy', d => d.y);
		};

		let simulation = d3.forceSimulation(nodes)
			.force('charge', d3.forceManyBody().strength(-1000))
			.force('link', d3.forceLink(links).distance(200))
			.force('x', d3.forceX())
			.force('y', d3.forceY())
			.alphaTarget(1)
			.on('tick', tick);

		let g = svg.append('g').attr('transform', `translate(${this.state.width / 2}, ${this.state.height / 2})`);
		let link = g.append('g').selectAll('.link');
		let node = g.append('g').selectAll('.node');
		let text = g.append('g').selectAll('.text');

		let update = () => {
			node = node.data(nodes, d => d.uuid);
			node.exit().remove();
			node = node.enter()
				.append('circle')
				.attr('r', 10)
				.attr('class', 'node')
				.merge(node);

			text = text.data(nodes, d => d.uuid);
			text.exit().remove();
			text = text.enter()
				.append('text')
				.text(d => d.uuid)
				.attr('fill', d => d.uuid === this.props.uuid ? 'red' : 'black')
				.attr('class', 'text')
				.merge(text);

			link = link.data(links, d => {
				let output;
				try {
					output = d.source.uuid + '-' + d.target.uuid
				} catch (e) {
					console.log(e);
				}
				return output;
			});
			link.exit().remove();
			link = link.enter()
				.append('line')
				.attr('class', 'link')
				.merge(link);

			simulation.nodes(nodes);
			simulation.force('link').links(links);
			simulation.alpha(1).restart();
		};

		this.subscription = this.props.peers.overview
			.subscribe(overview => {
				nodes = overview.nodes;
				links = overview.nodes.reduce((acc, node) => {
					let links = node.peers.map(peer => ({
						source: node,
						target: nodes.find(node => node.uuid === peer)
					}));

					return [...acc, ...links];
				}, [])
					.filter(link => {
						return link.source && link.target;
					});

				update();
			});

		update();
	}

	componentWillUnmount() {
		this.subscription.unsubscribe();
	}

	render() {
		return <div className="monitor">
			<svg ref={node => this.node = node} width={this.state.width} height={this.state.height}></svg>
		</div>;
	}
}
