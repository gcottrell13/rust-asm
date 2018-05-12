import * as React from 'react';
import { GetBlock, GetInstructionPointer } from '../utils/rustUtils';
import { Glyphicon } from 'react-bootstrap';
import { GetStatus } from '../utils/controlUtils';
import { ProcessorStatus } from '../utils/enums/ProcessorStatus';

export interface TextViewerProps {
}

interface IState {
    memory: number[];
    breakpoints: Set<number>;
    topLine: number;
}

export class TextViewer extends React.Component<TextViewerProps, IState> {
    state: IState = {
        memory: [],
        breakpoints: new Set(),
        topLine: 1,
    };

    componentWillMount() {
        let block = GetBlock(0);
        let memory: number[] = [];

        block.forEach((value, index) => {
            memory[index] = value;
        })

        this.setState({
            memory,
        });
    }

    onClickLine = (lineNumber: number) => {
        let breakpoints = new Set(this.state.breakpoints.values());
        if (this.state.breakpoints.has(lineNumber)) {
            breakpoints.delete(lineNumber);
        }
        else {
            breakpoints.add(lineNumber);
        }
        this.setState({
            breakpoints,
        });
    }

    onScroll = (e: any) => {
        if (e.deltaY < 0) {
            this.setState({
                topLine: Math.max(this.state.topLine - 1, 1),
            });
        }
        else if (e.deltaY > 0) {
            this.setState({
                topLine: Math.min(this.state.topLine + 1, this.state.memory.length - 1),
            });
        }
    };

    render() {
        let lines: JSX.Element[] = [];

        let nullsFound = 0;

        let pausedOn = -1;

        let viewableLines: number = window.innerHeight / 20 - 1;

        if (GetStatus() === ProcessorStatus.Paused) {
            pausedOn = GetInstructionPointer();
        }

        for(let index = this.state.topLine; 
            lines.length < viewableLines && index < this.state.memory.length; 
            index ++) {

            let value = this.state.memory[index];

            if (value === undefined) {
                break;
            }

            if (value === 0) {
                nullsFound ++;
            }
            else {
                nullsFound = 0;
            }

            if (nullsFound < 2) {
                lines.push(
                    <LineDisplay 
                        value={value}
                        lineNum={index}
                        onClick={this.onClickLine}
                        breakpoint={this.state.breakpoints.has(index)}
                        highlighted={index === pausedOn}
                        key={index}
                    />
                );
            }
            else if (nullsFound === 2) {
                lines.push(<div key={index}>...</div>);
            }
        }

        return (
            <div 
                className={'text-viewer'}
                onWheel={this.onScroll}
            >
                {lines}
            </div>
        )
    }
}


interface LineDisplayProps {
    value: string | number;
    lineNum: number;
    onClick: (lineNumber: number) => void;
    breakpoint: boolean;
    highlighted: boolean;
}

class LineDisplay extends React.PureComponent<LineDisplayProps> {
    onClick = () => {
        this.props.onClick(this.props.lineNum);
    };

    render() {
        let className = 'memory-line';

        if (this.props.highlighted) {
            className += ' highlight';
        }
        else if (this.props.breakpoint) {
            className += ' breakpoint';
        }


        return (
            <div
                onClick={this.onClick}
                className={className}
            >
                <span className={'line-number'}>
                    {this.props.lineNum}
                </span>
                <Glyphicon 
                    glyph={'minus'} 
                    style={{ visibility: (this.props.breakpoint ? 'visible' : 'hidden') }}
                    className={'breakpoint-glyph'}
                />
                {this.props.value}
            </div>
        )
    }
}