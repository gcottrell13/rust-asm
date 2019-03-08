import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { loadWasmAsync } from './utils/webAssembly';
import { getWasmImports } from './utils/wasmImports';
import { MAIN } from './components/main';

(self as any).MonacoEnvironment = {
	getWorkerUrl(moduleId: any, label: string) {
		if (label === 'json') {
			return './json.worker.bundle.js';
		}
		if (label === 'css') {
			return './css.worker.bundle.js';
		}
		if (label === 'html') {
			return './html.worker.bundle.js';
		}
		if (label === 'typescript' || label === 'javascript') {
			return './ts.worker.bundle.js';
		}
		return './editor.worker.bundle.js';
	}
}

loadWasmAsync('./wasm/dsl_wasm.wasm', getWasmImports()).then(() => {
	ReactDOM.render(
		<MAIN />,
		document.getElementById('output')
	);
});

/**
 * 1: Build WASM Engine
 * 2: Create file loading UI
 * 3: Setup buffers for process communication
 *  wasm should be able to:
 *      setup output buffer
 *      setup input buffer
 * 4: Create terminal and graphics output
 *
 * 5: Setup key input for graphics
 *
 * 6: Design and build assembler
 * 7: Design and build compiler of high level language
 */