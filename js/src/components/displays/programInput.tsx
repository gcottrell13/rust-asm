import React, { useEffect, useState } from 'react';
import { Well, FormControl, Button } from 'react-bootstrap';
import { FilePicker } from '../form/filePicker';
import { useGlobalDslWasmState } from '../../state/globalState';

export interface ProgramInputProps {
	onLoad: (text: string) => Promise<void>;
}

export function ProgramInput({ onLoad }: ProgramInputProps) {
	const [globalCompiledText] = useGlobalDslWasmState('dslCompiled');
	const [programText, setText] = useState(globalCompiledText);
	useEffect(
		() => {
			setText(globalCompiledText);
		},
		[globalCompiledText]
	);

	return (
		<div className={'input-container'}>
			<Well>
				Input Program. Choose a file or paste text.
			</Well>
			{
				programText !== '' ? (
					<Button
						onClick={() => onLoad(programText)}
						className={'load-button'}
						id={'load-button'}
					>
						Loads Program
					</Button>
				) : null
			}
			<FilePicker
				onChange={(filename: string, text: string) => setText(text)}
				id={'file-load'}
			/>
			<div className={'text-input-container'}>
				<FormControl
					className={'text-input'}
					componentClass="textarea"
					placeholder=""
					onChange={(event: any) => setText(event.target.value)}
					value={programText}
				/>
			</div>
		</div>
	);
}