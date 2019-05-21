import * as js from './rustUtils';


export const getWasmImports = () => {
	return {
		js_syscall: js.syscall,
	};
};