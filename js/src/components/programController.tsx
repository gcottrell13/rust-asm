import * as React from 'react';
import { TextViewer } from './displays/textViewer';
import { Glyphicon, Button } from 'react-bootstrap';
import { ProcessorStatus } from '../utils/wasmWorker/enums/ProcessorStatus';
import { AddListener, RemoveListener } from '../utils/debuggerEvents';
import { Events } from '../utils/wasmWorker/enums/Events';
import { EventListener } from './utils/EventListener';

export interface ProgramControllerProps {

}


interface IState {

}

export class ProgramController extends React.Component<ProgramControllerProps, IState> {
	state: IState = {
	};

	onPause = () => {

	};

	onContinue = () => {
	};

	onStop = () => {
		this.setState({});
	};

	onStepOver = () => {
		StepOverProgram();
	};

	render() {
		return (
			<div className={'controls-container'}>
				<div className={'program-controls'}>
					{
						CheckStatus([ProcessorStatus.Running]) && (
							<Button>
								<Glyphicon glyph={'pause'} />
							</Button>
						)
					}
					{
						CheckStatus([ProcessorStatus.NotStarted, ProcessorStatus.Paused]) && (
							<Button
								id={'continue-button'}
								onClick={this.onContinue}
							>
								<Glyphicon glyph={'play'} />
							</Button>
						)
					}
					{
						CheckStatus([ProcessorStatus.NotStarted, ProcessorStatus.Paused]) && (
							<Button
								id={'step-over-button'}
								onClick={this.onStepOver}
							>
								<Glyphicon glyph={'step-forward'} />
							</Button>
						)
					}
					{
						CheckStatus([ProcessorStatus.Halted]) && (
							<span>
								Program Halted
							</span>
						)
					}
				</div>
				<TextViewer
					blocksToDisplay={[0]}
					canSetBreakpoints={false}
					getPausedLine={() => CheckStatus([ProcessorStatus.Paused]) ? GetInstructionPointer() : -1}
					getBlock={x => [... GetBlock(x).getCombined()]} // TODO: make better
				/>
				<EventListener
					attach={AddListener}
					detach={RemoveListener}
					listeners={{
						[Events.HALT]: this.onStop,
					}}
				/>
			</div>
		);
	}
}