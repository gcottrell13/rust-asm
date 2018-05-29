import { CopyStringToRust, GetWasmExports } from "./webAssembly";
import { NMap, Maybe, Just, None } from "./utilTypes";
import { ProcessorStatus } from "./enums/ProcessorStatus";
import { Trigger } from "./debuggerEvents";
import { Events } from "./enums/Events";

const MEM_SIZE = 2048;

const blocks: NMap<number[]> = {};

/**
 * Returns one of the cached memory blocks stored in the JS side
 * @param n the block number
 */
export function GetBlock(n: number): Maybe<number[]> {
    if (blocks[n] !== undefined)
        return Just(blocks[n]);
    return None<number[]>();
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
    exports.map(e => rString.map(r => e.r_Initialize(r)));
    
    Trigger(Events.LOAD);
}

/**
 * Will prompt the rust processor to continue execution, if paused, not started, or already running.
 * No-op if the processor is halted or empty.
 */
export function Continue() {
    let exports = GetWasmExports();
    exports.map(e => e.r_Continue());
}

/**
 * If the rust processor is paused, a single operation will be performed.
 */
export function StepOver() {
    GetWasmExports().map(e => e.r_StepOver());
}

export function GetMemoryLocation(location: number): number {
    return GetWasmExports().map(e => e.r_GetMemoryLocation(location)).unwrap();
}

/**
 * Returns the current instruction pointer of the rust processor.
 */
export function GetInstructionPointer(): number {
    return GetWasmExports().prop('r_GetInstructionPointer').unwrap()();
}

/**
 * Sets a breakpoint in the rust processor.
 * No-op if the breakpoint is already added.
 * @param b the line number to add a breakpoint to.
 */
export function SetBreakpoint(b: number) {
    GetWasmExports().prop('r_SetBreakpoint').unwrap()(b);
}

/**
 * Removes a breakpoint in the rust processor.
 * No-op if the breakpoint doesn't exist.
 * @param b the line number to remove a breakpoint from
 */
export function RemoveBreakpoint(b: number) {
    GetWasmExports().prop('r_RemoveBreakpoint').unwrap()(b);
}