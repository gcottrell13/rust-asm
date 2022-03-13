import wasm from 'rust-asm';
import { dsl2machine } from '../language/compilers';
import { GetSyscallWithNumber, SyscallResult } from './syscalls';

let MEM_SIZE: number = -1;

/**
 * Returns a block of memory
 * @param n the block number
 */
export function GetBlock(n: number): CombinedArray {
	return wasm.;
}

// ------------------------------------------------------------------------------------
// functions that will be imported to rust
// ------------------------------------------------------------------------------------

/**
 * Runs a command
 * @param code the command to be run: see the list above
 * @param arg the argument to the command: also see above
 */
export function syscall(code: number, param: number): SyscallResult {
	return GetSyscallWithNumber(code)(param);
}


// ------------------------------------------------------------------------------------
// helper function to call rust
// ------------------------------------------------------------------------------------

/**
 * Initializes the rust processor with the given text
 * @param text the program text
 */
export function Initialize(text: string) {
	let exports = wasm;
	exports.r_Initialize();
	UpdateMemoryBlockSize();
	GetBlock(0).set(dsl2machine(text).slice(0, MEM_SIZE), 1);
}

/**
 * Will prompt the rust processor to continue execution, if paused, not started, or already running.
 * No-op if the processor is halted or empty.
 */
export function Continue() {
	let exports = wasm;
	exports.r_Continue();
}

/**
 * If the rust processor is paused, a single operation will be performed.
 */
export function StepOver() {
	wasm.r_StepOver();
}

/**
 * Returns the current instruction pointer of the rust processor.
 */
export function GetInstructionPointer(): number {
	return wasm.r_GetInstructionPointer();
}

/**
 * Sets a breakpoint in the rust processor.
 * No-op if the breakpoint is already added.
 * @param b the line number to add a breakpoint to.
 */
export function SetBreakpoint(b: number) {
	wasm.r_SetBreakpoint(b);
}

/**
 * Removes a breakpoint in the rust processor.
 * No-op if the breakpoint doesn't exist.
 * @param b the line number to remove a breakpoint from
 */
export function RemoveBreakpoint(b: number) {
	wasm.r_RemoveBreakpoint(b);
}

export function GetIsBreakpoint(b: number) {
	return wasm.r_GetIsBreakpoint(b);
}

/**
 * Gets the memory block size from rust
 */
export function UpdateMemoryBlockSize() {
	MEM_SIZE = wasm.r_GetMemoryBlockSize();
}

/**
 * Returns the WASM memory location of the requested location in the rust vm
 * @param location the location in the rust vm
 */
export function GetWasmMemoryLocation(location: number): number {
	return wasm.r_GetWasmMemoryLocation(location);
}

// InitializeWindowBarrel('rustUtils', {
// 	GetWasmMemoryLocation,
// 	setMemoryLocation,
// 	GetBlock,
// 	GetMemoryBuffer,
// 	MemSize: () => MEM_SIZE,
// 	CombinedArray,
// });