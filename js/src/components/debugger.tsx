import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import { ProgramInput } from './displays/programInput';
import './debugger.scss';
import { ProgramController } from './programController';
import { Viewscreen } from './displays/viewscreen';
import { InitializeWasmAsync } from '../utils/workerCommunication/messages';
import { createWebworkerAsync, AllWorkers } from '../utils/workerCommunication/comm';


export function DebuggerApplication() {
	const [loaded, setLoaded] = useState<boolean | null | undefined>(undefined);
	const [workerId, setWorkerId] = useState<string | null>(null);

	async function onProgramLoadAsync(text: string) {
		setLoaded(false);
		const _workerId = await createWebworkerAsync();
		console.log('got worker id', _workerId);
		if (_workerId != null) {
			await InitializeWasmAsync(_workerId, text);
			console.log('init worker', _workerId);
			setWorkerId(_workerId);
			setLoaded(true);
		}
		else {
			setWorkerId(null);
		}
	}

	useEffect(
		() => () => {
			workerId && AllWorkers.killWorker(workerId);
		},
		[workerId]
	);

	return (
		<div className={'debugger-container'}>
			<Row>
				<Col xs={3} className={'program-text'}>
					{
						loaded === true ? (
							<ProgramController workerId={workerId!} />
						) : (
								loaded === undefined ?
									<ProgramInput onLoad={onProgramLoadAsync} />
									: (
										loaded === null ?
										<span>Failed to load worker</span>
										: <span>Loading worker...</span>
									)
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