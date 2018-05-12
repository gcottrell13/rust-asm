import { CopyStringToRust, GetWasmExports } from "./webAssembly";
import { NMap } from "./utilTypes";
import { ProcessorStatus } from "./enums/ProcessorStatus";

const MEM_SIZE = 2048;

const blocks: NMap<number[]> = {};

/**
 * Returns one of the cached memory blocks stored in the JS side
 * @param n the block number
 */
export function GetBlock(n: number): number[] | null {
    if (blocks[n] !== undefined)
        return blocks[n];
    return null;
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

// syscalls:
// 1 - init new buffer with ID from bus (so JS can reference buffer with given ID)
//      [follow with syscall 2, syscall 3, and syscall 4 or 5]
//      IDs are NOT shared between inputs and outputs
// 2 - initialize newest buffer start (param address)
// 3 - initialize newest buffer length (param length)
// 4 - set buffer with ID from bus as input (JS puts key presses in all input buffers)
// 5 - set buffer with ID from bus as output (JS will take output and apply to whatever it likes)
//      buffer ID 1 - terminal output
//      buffer ID 2 - drawing output
//      buffer ID 3 - file output
// 6 - clear buffer with ID from bus (JS drops buffer)
// 7 - reset buffer with ID from bus (moves JS buffer head back to start)
// 8 - ready file with filename pointer (param address) 
//      [follow with syscall 9]
// 9 - load file contents into buffer with ID from bus (must be an input buffer)
// 10 - sleep (param ms time)
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
    exports.r_Initialize(rString);
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
    let exports = GetWasmExports();
    exports.r_StepOver();
}

/**
 * Returns the current instruction pointer of the rust processor.
 */
export function GetInstructionPointer() {
    let exports = GetWasmExports();
    return exports.r_GetInstructionPointer();
}

/**
 * Sets a breakpoint in the rust processor.
 * No-op if the breakpoint is already added.
 * @param b the line number to add a breakpoint to.
 */
export function SetBreakpoint(b: number) {
    let exports = GetWasmExports();
    exports.r_SetBreakpoint(b);
}

/**
 * Removes a breakpoint in the rust processor.
 * No-op if the breakpoint doesn't exist.
 * @param b the line number to remove a breakpoint from
 */
export function RemoveBreakpoint(b: number) {
    let exports = GetWasmExports();
    exports.r_RemoveBreakpoint(b);
}