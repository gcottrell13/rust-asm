import { SMap, Maybe } from "./utilTypes";

export interface WasmExports {
    r_SetBreakpoint: (b: number) => void;
    r_RemoveBreakpoint: (b: number) => void;
    r_Continue: () => void;
    r_StepOver: () => void;
    r_GetInstructionPointer: () => number;
    r_Initialize: () => void;
    r_GetProcessorStatus: () => number;
    r_EnableBreakpoints: () => void;
    r_DisableBreakpoints: () => void;
    r_GetMemoryBlockSize: () => number;
    r_GetWasmMemoryLocation: (location: number) => number;
    memory: WebAssembly.Memory;
}

const data: {
    instance: Maybe<WebAssembly.Instance>;
} = {
    instance: Maybe<WebAssembly.Instance>(),
};

/**
 * Returns all functions exposed in rust.
 */
export function GetWasmExports(): WasmExports {
    return data.instance.prop('exports').unwrap() as WasmExports;
}
function setWasmExport(instance: WebAssembly.Instance) {
    data.instance = Maybe(instance);
    
    (window as any).WasmExports = instance.exports;
}

export const wasmReadStrFromMemory = (buffer: ArrayBuffer, ptr: number, length: number) => {
    const buf = new Uint8Array(buffer, ptr, length);
    return new TextDecoder('utf8').decode(buf);
};

/**
 * Loads the WASM module. This is the first thing that should be done.
 * @param filepath .wasm
 * @param wasmImports the js functions that are to be imported to rust
 */
export const loadWasmAsync = async (filepath: string, wasmImports: any): Promise<void> => {
    if (data.instance.value() !== null) {
        return;
    }

    let response = await fetch(filepath);
    let bytes = await response.arrayBuffer();
    let results = await WebAssembly.instantiate(bytes, { env: wasmImports }) ;
    setWasmExport(results.instance);
};