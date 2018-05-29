import * as React from 'react';
import { Well, FormControl, Button } from 'react-bootstrap';
import { FilePicker } from './form/filePicker';
import { Initialize, Continue } from '../utils/rustUtils';
import { Trigger } from '../utils/debuggerEvents';
import { Events } from '../utils/enums/Events';

export interface ProgramInputProps {
}

interface IState {
    programText: string;
}

export class ProgramInput extends React.Component<ProgramInputProps, IState> {
    state: IState = {
        programText: '',
    };

    handleTextInput = (event: any) => {
        this.setState({
            programText: event.target.value,
        });
    };

    Load = () => {
        Initialize(this.state.programText);
    };


    onUploadText = (filename: string, text: string) => {
        this.setState({
            programText: text,
        });
    }

    render() {
        return (
            <div className={'input-container'}>
                <Well>
                    Input Program. Choose a file or paste text.
                </Well>
                {
                    this.state.programText !== '' ? (
                        <Button
                            onClick={this.Load}
                            className={'load-button'}
                        >
                            Loads Program
                        </Button>
                    ) : null
                }
                <FilePicker 
                    onChange={this.onUploadText}
                />
                <div className={'text-input-container'}>
                    <FormControl 
                        className={'text-input'}
                        componentClass="textarea" 
                        placeholder="" 
                        onChange={this.handleTextInput} 
                        value={this.state.programText}
                    />
                </div>
            </div>
        );
    }
}