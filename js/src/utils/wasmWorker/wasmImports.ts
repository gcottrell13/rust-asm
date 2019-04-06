import * as js from './rustUtils';


export const getWasmImports = () => {
	return {
		js_setMemoryLocation: js.setMemoryLocation,
		js_syscall: js.syscall,
	};
};