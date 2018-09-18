import { GetWasmExports } from "./webAssembly";
import { Maybe } from "./utilTypes";
import { Trigger } from "./debuggerEvents";
import { Events } from "./enums/Events";
import { dsl2machine } from "./language/compilers";
import { WriteAllBuffersToWasm } from "./language/syscalls";
import { RefreshScreen } from "./screenDriver";
import { InitializeWindowBarrel } from "./windowBarrel";

let MEM_SIZE = 2048;

export function GetMemoryBuffer(location: number, length: number): Maybe<Int32Array> {
    let memoryLocation = GetWasmExports().r_GetWasmMemoryLocation(location);
    if (memoryLocation === 0) {
        return Maybe<Int32Array>(null);
    }
    let left = MEM_SIZE - location % MEM_SIZE;
    return Maybe(new Int32Array(GetWasmExports().memory.buffer, memoryLocation, Math.min(left, length)));
}

/**
 * Returns a block of memory
 * @param n the block number
 */
export function GetBlock(n: number): Maybe<Int32Array> {
    return GetMemoryBuffer(n * MEM_SIZE, MEM_SIZE);
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
    let loc = GetMemoryBuffer(location, 1);
    loc.map(buffer => buffer.set([value]));
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
    let exports = GetWasmExports();
    exports.r_Initialize();

    GetBlock(0)
        .map(b => b.set(dsl2machine(text).slice(0, MEM_SIZE), 1));
        
    Trigger(Events.LOAD);
}

export function MainLoop() {
    Continue();
    WriteAllBuffersToWasm();
    RefreshScreen();
    // terminal
}

/**
 * steps to run WASM:
 * 
 * - load text into wasm and initialize
 *      EMPTY -> NOT STARTED
 * - Continue()
 *      RUNNING
 * - wasm will pause
 * - refresh all buffer contents
 *      input buffers will recieve contents
 *      
 * - draw screen buffer (if it exists)
 * - output to terminal
 * - loop continue
 */

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

InitializeWindowBarrel('rustUtils', {
    GetWasmMemoryLocation,
    setMemoryLocation,
    GetBlock,
    GetMemoryBuffer,
    MemSize: () => MEM_SIZE,
});