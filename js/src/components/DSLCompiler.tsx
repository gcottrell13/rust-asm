import React, { useState } from 'react';
import { Button, Col, FormControl, Row } from 'react-bootstrap';
import { TextViewer } from './displays/textViewer';
import { asm2dsl, dsl2machine } from '../utils/language/compilers';
import { isNotNullOrWhitespace } from '../utils/stringUtils';

export interface DslCompilerProps {

}

function useCompiler(text: string): [string, string, () => void] {
	const [compiledText, setCompiledText] = useState<string>('');
	const [compilerError, setCompilerError] = useState('');
	const compile = () => {
		try {
			// setCompiledText(dsl2machine(asm2dsl(text)));
			setCompiledText(asm2dsl(text));
		}
		catch (e) {
			setCompilerError(e.message);
		}
	};

	return [compiledText, compilerError, compile];
}

export function DslCompiler(props: DslCompilerProps) {
	const [dslText, setDslText] = useState('');
	const [compiledText, compilerError, compile] = useCompiler(dslText);

	return (
		<div className={'input-container'}>
			<Row>
				<Col xs={3} className={'text-input-container'}>
					<FormControl
						className={'text-input'}
						componentClass="textarea"
						placeholder="DSL Here"
						onChange={(event: any) => setDslText(event.target.value)}
						value={dslText}
					/>
				</Col>
				<Col xs={3}>
					{/*<TextViewer*/}
						{/*blocksToDisplay={[1]}*/}
						{/*canSetBreakpoints={false}*/}
						{/*getPausedLine={() => -1}*/}
						{/*getBlock={() => [1, 2, 3]}*/}
					{/*/>*/}
					<div>
						{compiledText}
					</div>
				</Col>
				<Col xs={3}>
					<Button onClick={compile}>Compile</Button>
					{
						isNotNullOrWhitespace(compilerError) && (
							<div>
								{compilerError}
							</div>
						)
					}
				</Col>
			</Row>
		</div>
	);
}