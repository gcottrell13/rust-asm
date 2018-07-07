import * as React from 'react';
import { TextViewer } from './textViewer';
import { Glyphicon, Button } from 'react-bootstrap';
import { CheckStatus, StepOverProgram } from '../utils/controlUtils';
import { ProcessorStatus } from '../utils/enums/ProcessorStatus';
import { EasyKeys, Call } from './utils/EasyKeys';
import { ControlKeys } from '../utils/keyCodes';

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
                <TextViewer blocksToDisplay={[0]}/>
                <EasyKeys
                    keys={{
                        s: {
                            event: Call,
                            buttonSelector: '#step-over-button',
                        },
                        [ControlKeys.DOWN]: {
                            event: Call,
                            buttonSelector: '#step-over-button',
                        }
                    }}
                />
            </div>
        )
    }
}