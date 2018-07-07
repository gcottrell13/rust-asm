import * as React from 'react';
import { Button, FormGroup, ControlLabel, Row, Col, FormControl } from 'react-bootstrap';
import { ProgramInput } from './programInput';
import './debugger.scss';
import { ProgramController } from './programController';
import { AddListener, RemoveListener } from '../utils/debuggerEvents';
import { Events } from '../utils/enums/Events';
import { EventListener } from './utils/EventListener';


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
                                <ProgramController />
                            ) : (
                                <ProgramInput />
                            )
                        }
                    </Col>
                    <Col xs={5} className={'output'}>
                        <pre>
                            text
                        </pre>
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
        )
    }
}