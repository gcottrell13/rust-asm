import { CopyStringToRust, GetWasmExports } from "./webAssembly";
import { NMap, Maybe, Just, None } from "./utilTypes";
import { ProcessorStatus } from "./enums/ProcessorStatus";
import { Trigger } from "./debuggerEvents";
import { Events } from "./enums/Events";

let MEM_SIZE = 2048;

const blocks: NMap<number[]> = {};

/**
 * Returns one of the cached memory blocks stored in the JS side
 * @param n the block number
 */
export function GetBlock(n: number): Maybe<number[]> {
    return Maybe(blocks[n]);
}

// ------------------------------------------------------------------------------------
// functions that will be imported to rust
// ------------------------------------------------------------------------------------

/**
 * Caches a value at a memory location in the JS memory cache
 * @param location the memory address
 * @param value the value to be stored
 */
export function setMemoryLocation(location: number, value: number) {
    let blockNum = Math.floor(location / MEM_SIZE);
    let position = location % MEM_SIZE;

    if (!blocks[blockNum]) {
        blocks[blockNum] = [];
    }

    blocks[blockNum][position] = value;
}

/**
 * Runs a command
 * @param code the command to be run: see the list above
 * @param arg the argument to the command: also see above
 */
export function syscall(code: number, arg: number) {
    alert(`Syscall: ${code} ${arg}`);
}


// ------------------------------------------------------------------------------------
// helper function to call rust
// ------------------------------------------------------------------------------------

/**
 * Initializes the rust processor with the given text
 * @param text the program text
 */
export function Initialize(text: string) {
    let rString = CopyStringToRust(text);
    let exports = GetWasmExports();
    rString.map(r => exports.r_Initialize(r));
    
    Trigger(Events.LOAD);
}

/**
 * Will prompt the rust processor to continue execution, if paused, not started, or already running.
 * No-op if the processor is halted or empty.
 */
export function Continue() {
    let exports = GetWasmExports();
    exports.r_Continue();
}

/**
 * If the rust processor is paused, a single operation will be performed.
 */
export function StepOver() {
    GetWasmExports().r_StepOver();
}

export function GetMemoryLocation(location: number): number {
    return GetWasmExports().r_GetMemoryLocation(location);
}

/**
 * Returns the current instruction pointer of the rust processor.
 */
export function GetInstructionPointer(): number {
    return GetWasmExports().r_GetInstructionPointer();
}

/**
 * Sets a breakpoint in the rust processor.
 * No-op if the breakpoint is already added.
 * @param b the line number to add a breakpoint to.
 */
export function SetBreakpoint(b: number) {
    GetWasmExports().r_SetBreakpoint(b);
}

/**
 * Removes a breakpoint in the rust processor.
 * No-op if the breakpoint doesn't exist.
 * @param b the line number to remove a breakpoint from
 */
export function RemoveBreakpoint(b: number) {
    GetWasmExports().r_RemoveBreakpoint(b);
}

/**
 * Gets the memory block size from rust
 */
export function UpdateMemoryBlockSize() {
    MEM_SIZE = GetWasmExports().r_GetMemoryBlockSize();
}

/**
 * Returns the WASM memory location of the requested location in the rust vm
 * @param location the location in the rust vm
 */
export function GetWasmMemoryLocation(location: number): number {
    return GetWasmExports().r_GetWasmMemoryLocation(location);
}