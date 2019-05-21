import React, { useState } from 'react';
import { TextViewer } from './displays/textViewer';
import { Glyphicon, Button } from 'react-bootstrap';
import { StepAsync, RequestBlockAsync, RunAsync, SetBreakpointAsync } from '../utils/workerCommunication/messages';

export interface ProgramControllerProps {
	workerId: string;
}


export function ProgramController({
	workerId,
}: ProgramControllerProps) {
	const [status, setStatus] = useState<'running' | 'paused'>('paused');
	const [currentLine, setCurrentLine] = useState(0);
	const [currentBlock, setCurrentBlock] = useState<number[] | null>(null);
	const [currentBlockNum, setCurrentBlockNum] = useState(-1);

	const onRequestBlockAsync = async (num: number) => {
		if (num !== currentBlockNum) {
			console.log('requesting block', num);
			const data = await RequestBlockAsync(workerId, num);
			if (data) {
				setCurrentBlock(data);
				setCurrentBlockNum(num);
			}
			else {
				console.log('did not get data');
			}
		}
		return currentBlock;
	};

	const setBreakpointAsync = async (line: number) => {
		await SetBreakpointAsync(workerId, line);
	};
	
	const onPause = (_currentLine: number) => {
		setStatus('paused');
		setCurrentLine(_currentLine);
	};

	const Continue = () => {
		setStatus('running');
		RunAsync(workerId)
			.then(data => onPause(data ? data.stoppedOnLine : currentLine));
	};

	const StepOver = () => {
		StepAsync(workerId)
			.then(data => onPause(data ? data.stoppedOnLine : currentLine));
	};

	return (
		<div className={'controls-container'}>
			<div className={'program-controls'}>
				{
					status === 'running' && (
						<Button>
							<Glyphicon glyph={'pause'} />
						</Button>
					)
				}
				{
					status === 'paused' && (
						<Button
							id={'continue-button'}
							onClick={Continue}
						>
							<Glyphicon glyph={'play'} />
						</Button>
					)
				}
				{
					status === 'paused' && (
						<Button
							id={'step-over-button'}
							onClick={StepOver}
						>
							<Glyphicon glyph={'step-forward'} />
						</Button>
					)
				}
			</div>
			<TextViewer
				blocksToDisplay={[0]}
				setBreakpointAsync={setBreakpointAsync}
				getPausedLine={() => status === 'paused' ? currentLine : -1}
				getBlockAsync={onRequestBlockAsync}
			/>
		</div>
	);
}
