import * as React from 'react';
import { TextViewer } from './textViewer';
import { Glyphicon, Button } from 'react-bootstrap';
import { CheckStatus } from '../utils/controlUtils';
import { ProcessorStatus } from '../utils/enums/ProcessorStatus';

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
                                onClick={this.onContinue}
                            >
                                <Glyphicon glyph={'play'} />
                            </Button>
                        )
                    }
                </div>
                <TextViewer />
            </div>
        )
    }
}