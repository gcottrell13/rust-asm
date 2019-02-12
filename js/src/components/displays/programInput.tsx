import React, { useState } from 'react';
import { Well, FormControl, Button } from 'react-bootstrap';
import { FilePicker } from '../form/filePicker';

export interface ProgramInputProps {
	onLoad: (text: string) => void;
}

export function ProgramInput(props: ProgramInputProps) {
	const [programText, setText] = useState('');

	return (
		<div className={'input-container'}>
			<Well>
				Input Program. Choose a file or paste text.
			</Well>
			{
				programText !== '' ? (
					<Button
						onClick={() => props.onLoad(programText)}
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