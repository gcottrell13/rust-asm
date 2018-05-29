import { SMap, Maybe, Just, prop, None } from "./utilTypes";

interface RustString {

}
type RustStringData = number;

export interface WasmExports {
    r_SetBreakpoint: (b: number) => void;
    r_RemoveBreakpoint: (b: number) => void;
    r_Continue: () => void;
    r_SetMemoryLocation: (location: number, value: number) => void;
    r_GetMemoryLocation: (location: number) => number;
    r_StepOver: () => void;
    r_GetInstructionPointer: () => number;
    // r_GetMemory: (blockNum: number) => number[];
    r_Initialize: (text: RustString) => void;
    r_GetProcessorStatus: () => number;
    r_EnableBreakpoints: () => void;
    r_DisableBreakpoints: () => void;
    stringPrepare: (length: number) => RustString;
    stringData: (str: RustString) => RustStringData;
}

const data: {
    instance: Maybe<WebAssembly.Instance>;
} = {
    instance: None<WebAssembly.Instance>(),
};

/**
 * Prepares and copies the given string to rust.
 * TODO: deallocation?
 * @param str the text to copy
 */
export function CopyStringToRust(str: string): Maybe<RustString> {
    const encoder = new TextEncoder();
    const encodedString = encoder.encode(str);
    
    if (data.instance.value() === null) return None<RustString>();
    
    return GetWasmExports().map(wasm => {
        const rustString = wasm.stringPrepare(encodedString.length);

        const rustStringData = wasm.stringData(rustString);
        const asBytes = new Uint8Array(data.instance.prop('exports').unwrap().memory.buffer, rustStringData, encodedString.length);

        asBytes.set(encodedString);

        return rustString;
    });
}

/**
 * Returns all functions exposed in rust.
 */
export function GetWasmExports(): Maybe<WasmExports> {
    return data.instance.prop('exports');
}
function setWasmExport(instance: WebAssembly.Instance) {
    data.instance = Just(instance);
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
    if (data.instance !== null) {
        return;
    }

    let response = await fetch(filepath);
    let bytes = await response.arrayBuffer();
    let results = await WebAssembly.instantiate(bytes, { env: wasmImports }) ;
    setWasmExport(results.instance);
};