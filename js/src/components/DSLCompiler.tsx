import React, { useState } from 'react';
import { Button, Col, FormControl, Row, Tab } from 'react-bootstrap';
import { TextViewer } from './displays/textViewer';
import { asm2dsl, dsl2machine } from '../utils/language/compilers';
import { isNullOrWhitespace } from '../utils/stringUtils';
import { MyMonacoEditor } from './displays/monacoEditor/MyMonacoEditor';

export interface DslCompilerProps {

}

function useCompiler(text: string): [string, string, () => void] {
	const [compiledText, setCompiledText] = useState<string>('');
	const [compilerError, setCompilerError] = useState('');
	const compile = () => {
		try {
			// setCompiledText(dsl2machine(asm2dsl(text)));
			setCompiledText(asm2dsl(text));
			setCompilerError('Compiled successfully');
		}
		catch (e) {
			setCompilerError(e.message);
		}
	};

	return [compiledText, compilerError, compile];
}

export function DslCompiler({}: DslCompilerProps) {
	const [dslText, setDslText] = useState('');
	const [compiledText, compilerError, compile] = useCompiler(dslText);

	const options = {
		selectOnLineNumbers: false,
	};

	return (
		<div className={'input-container'}>
			<Row className={'full-height'}>
				<Col xs={5} className={'text-input-container full-height'}>
					<MyMonacoEditor
						width={'100%'}
						height={'calc(100vh - 60px)'}
						language="dsla"
						theme="dsla"
						value={dslText}
						onChange={setDslText}
						options={options}
						editorDidMount={e => e.focus()}
					/>
				</Col>
				<Col xs={5} className={'full-height'}>
					<TextViewer
						blocksToDisplay={[compiledText.length]}
						canSetBreakpoints={false}
						getPausedLine={() => -1}
						getBlock={() => compiledText.split('\n')}
					/>
				</Col>
				<Col xs={2}>
					<Button onClick={compile}>Compile</Button>
					{
						!isNullOrWhitespace(compilerError) && (
							<div>
								{compilerError.split('\n').map((x, i) => <div key={i}>{x}</div>)}
							</div>
						)
					}
				</Col>
			</Row>
		</div>
	);
}