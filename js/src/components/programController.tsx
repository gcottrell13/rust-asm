import * as React from 'react';
import { TextViewer } from './displays/textViewer';
import { Glyphicon, Button } from 'react-bootstrap';
import { StepAsync, RequestBlockAsync } from '../utils/workerCommunication/messages';

export interface ProgramControllerProps {

}


interface IState {
	status: 'running' | 'paused';
	currentLine: number;
	currentBlock: number[] | null;
	currentBlockNum: number;
}

export class ProgramController extends React.Component<ProgramControllerProps, IState> {
	state: IState = {
		status: 'paused',
		currentLine: 0,
		currentBlock: null,
		currentBlockNum: -1,
	};

	onRequestBlock = (num: number) => {
		const { currentBlockNum, currentBlock } = this.state;
		if (num !== currentBlockNum) {
			RequestBlockAsync(AllWorkers.getIds()[0], num)
			.then((data) => {
				if (data) {
					this.setState({
						currentBlock: data.block ? [...data.block] : null,
						currentBlockNum: num,
					});
				}
			});
			return null;
		}
		else {
			return currentBlock;
		}
	};

	onPause = (currentLine: number) => {
		this.setState({
			status: 'paused',
			currentLine,
		});
	};

	onContinue = () => {
		this.setState({
			status: 'running',
		});
	};

	onStop = () => {
		this.setState({});
	};

	onStepOver = () => {
		StepAsync(AllWorkers.getIds()[0])
			.then(data => this.onPause(data ? data.stoppedOnLine : this.state.currentLine));
		this.onContinue();
	};

	render() {
		const { status, currentLine, currentBlockNum } = this.state;
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
								onClick={this.onContinue}
							>
								<Glyphicon glyph={'play'} />
							</Button>
						)
					}
					{
						status === 'paused' && (
							<Button
								id={'step-over-button'}
								onClick={this.onStepOver}
							>
								<Glyphicon glyph={'step-forward'} />
							</Button>
						)
					}
				</div>
				<TextViewer
					blocksToDisplay={[currentBlockNum]}
					canSetBreakpoints={false}
					getPausedLine={() => status === 'paused' ? currentLine : -1}
					getBlock={this.onRequestBlock}
				/>
			</div>
		);
	}
}