import React, { useState } from 'react';
import { Button, FormGroup, Row, Col, FormControl } from 'react-bootstrap';
import { ProgramInput } from './displays/programInput';
import './debugger.scss';
import { ProgramController } from './programController';
import { Viewscreen } from './displays/viewscreen';
import { InitializeWasmAsync } from '../utils/workerCommunication/messages';
import { useGlobalDslWasmState } from '../state/globalState';


export function DebuggerApplication() {
	const [loaded, setLoaded] = useState<boolean | null>(null);
	const [loaded, setLoaded] = useState(false);

	function onProgramLoad() {
		setLoaded(true);
	}

	return (
		<div className={'debugger-container'}>
			<Row>
				<Col xs={3} className={'program-text'}>
					{
						loaded ? (
							<ProgramController/>
						) : (
							<ProgramInput onLoad={text => InitializeWasmAsync(activeWorkers[0], text).then(() => onProgramLoad())}/>
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
		</div>
	);
}