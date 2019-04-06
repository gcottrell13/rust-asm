import React, { useState } from 'react';
import { Glyphicon } from 'react-bootstrap';

export interface TextViewerProps {
	blocksToDisplay: number[];
	canSetBreakpoints: boolean;
	getPausedLine: () => number;
	getBlock: (blockNum: number) => (number | string)[];

	allowEditing?: boolean;
	hideNullRuns?: boolean;
}

export function TextViewer({
	blocksToDisplay,
	canSetBreakpoints,
	getBlock,
	getPausedLine,
	hideNullRuns = false,
	allowEditing = false,
}: TextViewerProps) {
	const [breakpoints, setBreakpoint] = useState<Set<number>>(new Set());
	const [topLine, setTopLine] = useState(1);

	const onClickLine = (lineNumber: number) => {
		if (!canSetBreakpoints) return;

		let newBreakpoints = new Set(breakpoints.values());
		if (newBreakpoints.has(lineNumber)) {
			newBreakpoints.delete(lineNumber);
		}
		else {
			newBreakpoints.add(lineNumber);
		}
		setBreakpoint(newBreakpoints);
	};

	const onScroll = (e: any) => {
		if (e.deltaY < 0) {
			setTopLine(Math.max(topLine - 1, 1));
		}
		else if (e.deltaY > 0) {
			setTopLine(Math.min(topLine + 1, memory.length - 1));
		}
	};

	const memory = blocksToDisplay.reduce<(string | number)[]>((prev, blockNum) => prev.concat(getBlock(blockNum)), ['']);

	let lines: JSX.Element[] = [];

	let nullsFound = 0;

	let pausedOn = getPausedLine();

	let viewableLines: number = window.innerHeight / 20 - 1;

	for (let index = topLine;
		lines.length < viewableLines && index < memory.length;
		index++) {

		let value = memory[index];

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
					onClick={onClickLine}
					breakpoint={breakpoints.has(index)}
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
			className={'text-viewer full-height'}
			onWheel={onScroll}
		>
			{lines}
		</div>
	);
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