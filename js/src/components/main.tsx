import { Tab, Tabs } from 'react-bootstrap';
import { DebuggerApplication } from './debugger';
import React from 'react';
import { DslCompiler } from './DSLCompiler';

export const MAIN = () => {
	return (
		<Tabs
			id={'tabs'}
			mountOnEnter={true}
		>
			<Tab 
				title={'Debugger'}
				eventKey={'debugger'}
			>
				<DebuggerApplication />
			</Tab>
			<Tab
				title={'DSL Compiler'}
				eventKey={'dslCompiler'}
			>
				<DslCompiler />
			</Tab>
		</Tabs>
	);
};