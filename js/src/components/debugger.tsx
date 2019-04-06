import * as React from 'react';
import { Button, FormGroup, Row, Col, FormControl } from 'react-bootstrap';
import { ProgramInput } from './displays/programInput';
import './debugger.scss';
import { ProgramController } from './programController';
import { AddListener, RemoveListener } from '../utils/debuggerEvents';
import { EventListener } from './utils/EventListener';
import { Viewscreen } from './displays/viewscreen';
import { InitializeWasm } from '../utils/workerCommunication/messages';


interface IState {
	loaded: boolean;
}

export class DebuggerApplication extends React.Component<{}, IState> {
	state: IState = {
		loaded: false,
	};

	onProgramLoad = () => {
		this.setState({
			loaded: true,
		});
	};

	render() {
		return (
			<div className={'debugger-container'}>
				<Row>
					<Col xs={3} className={'program-text'}>
						{
							this.state.loaded ? (
								<ProgramController/>
							) : (
								<ProgramInput onLoad={InitializeWasm}/>
							)
						}
					</Col>
					<Col xs={5} className={'output'}>
						<Viewscreen
							height={400}
							width={400}
							layerCount={2}
						/>
					</Col>
					<Col xs={4} className={'screen'}>
						<pre>
							text
						</pre>
					</Col>
				</Row>
				<EventListener<Events, () => void>
					attach={AddListener}
					detach={RemoveListener}
					listeners={{
						[Events.LOAD]: this.onProgramLoad,
					}}
				/>
			</div>
		);
	}
}