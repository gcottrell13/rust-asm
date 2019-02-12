import * as React from 'react';

export interface TerminalProps {
	outputOnly: boolean;
}

interface IState {
	text: string;
}

export class Terminal extends React.Component<TerminalProps, IState> {

	onInput = (e: any) => {

	};

	render() {
		return (
			<div className={'terminal'}>
				{this.state.text}
			</div>
		);
	}
}