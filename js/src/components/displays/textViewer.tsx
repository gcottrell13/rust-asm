import * as React from 'react';
import { GetBlock, GetInstructionPointer } from '../../utils/rustUtils';
import { Glyphicon } from 'react-bootstrap';
import { ProcessorStatus } from '../../utils/enums/ProcessorStatus';
import { CheckStatus } from '../../utils/controlUtils';
import { AddListener } from '../../utils/debuggerEvents';
import { Events } from '../../utils/enums/Events';

export interface TextViewerProps {
	blocksToDisplay: number[];
	canSetBreakpoints: boolean;
	getPausedLine: () => number;
	getBlock: (blockNum: number) => number[];

	hideNullRuns?: boolean;
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

	refreshMemory() {
		const { blocksToDisplay, getBlock } = this.props;

		let memory: number[] = [];

		blocksToDisplay.forEach(blockNum => memory.concat(getBlock(blockNum)));

		this.setState({
			memory,
		});
	}

	// componentWillMount() {
	// 	this.refreshMemory();
	// 	AddListener(Events.PAUSE, this.Pause);
	// }
	//
	// Continue = () => {
	// 	this.setState({});
	// };
	//
	// Pause = () => {
	// 	this.refreshMemory();
	// };

	onClickLine = (lineNumber: number) => {
		if (!this.props.canSetBreakpoints) return;

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
	};

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
		const { hideNullRuns, getPausedLine } = this.props;

		let lines: JSX.Element[] = [];

		let nullsFound = 0;

		let pausedOn = getPausedLine();

		let viewableLines: number = window.innerHeight / 20 - 1;

		for (let index = this.state.topLine;
			lines.length < viewableLines && index < this.state.memory.length;
			index++) {

			let value = this.state.memory[index];

			if (value === undefined) {
				break;
			}

			if (hideNullRuns) {
				if (value === 0 && Math.abs(index - pausedOn) > 2) {
					nullsFound++;
				}
				else {
					nullsFound = 0;
				}
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
		);
	}
}


interface LineDisplayProps {
	value: string | number;
	lineNum: number;
	onClick: (lineNumber: number) => void;
	breakpoint: boolean;
	highlighted: boolean;
}

function LineDisplay(props: LineDisplayProps) {
	const onClick = () => {
		props.onClick(props.lineNum);
	};

	let className = 'memory-line';

	if (props.highlighted) {
		className += ' highlight';
	}
	else if (props.breakpoint) {
		className += ' breakpoint';
	}


	return (
		<div
			onClick={onClick}
			className={className}
		>
				<span className={'line-number'}>
					{props.lineNum}
				</span>
			<Glyphicon
				glyph={'minus'}
				style={{ visibility: (props.breakpoint ? 'visible' : 'hidden') }}
				className={'breakpoint-glyph'}
			/>
			{props.value}
		</div>
	);
}