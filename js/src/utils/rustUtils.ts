import { GetWasmExports } from './webAssembly';
import { Maybe } from './utilTypes';
import { Trigger } from './debuggerEvents';
import { Events } from './enums/Events';
import { dsl2machine } from './language/compilers';
import { RefreshBuffers, GetSyscallWithNumber, SyscallResult } from './language/syscalls';
import { RefreshScreen } from './screenDriver';
import { InitializeWindowBarrel } from './windowBarrel';

// Opcodes:
// 0    NO-OP
// 1    load memory location (param relative pointer to location) => bus
//          points to an absolute address
// 2    bus => set memory location (param relative pointer to location)
//          points to an absolute address
// 3    load relative memory (param offset) => bus
// 4    bus => set relative memory (param offset)
// 5    bus => alu
// 6    add => bus and keep in alu
// 7    negate => bus and keep in alu
// 8    multiply => bus and keep in alu
// 9    invert (1/x) => bus and keep in alu
// 10   jump relative from bus
// 11   bgz value from bus, jump relative (param offset)
// 12   blz value from bus, jump relative (param offset)
// 13   bez value from bus, jump relative (param offset)
// 14   allocate new block
// 15   syscall (code from bus)
// 16   halt
// 17   pause (halts but also advances 1 step)
// 18   load memory location (param location) => bus
// 19   bus => set memory location (param location)
// 20   load immediate to bus (param value)

let MEM_SIZE = 2048;

class CombinedBuffer {
	private combined: Int32Array;

	constructor(initial: Int32Array[]) {
		const length = initial.reduce((sum, arr) => sum + arr.length, 0);
		const combined = new Int32Array(length);

		let offset = 0;
		initial.forEach((element) => {
			combined.set(element, offset);
			offset += element.length;
		});

		this.combined = combined;
	}

	set(array: CombinedBuffer, offset?: number): void;
	set(array: Int32Array, offset?: number): void;
	set(array: ArrayLike<number>, offset?: number): void;
	set(array: CombinedBuffer | Int32Array | ArrayLike<number>, offset?: number): void {
		if (array instanceof CombinedBuffer) {
			this.combined.set(array.getCombined(), offset);
		}
		else {
			this.combined.set(array, offset);
		}
	}

	getCombined(): Int32Array {
		return this.combined.subarray(0);
	}
	
	get length(): number {
		return this.combined.length;
	}
}

export function GetMemoryBuffer(location: number, length: number): CombinedBuffer {
	const get = GetWasmExports().r_GetWasmMemoryLocation;
	const memoryBuffer = GetWasmExports().memory.buffer;
	const bufferParts: Int32Array[] = [];

	let remainingLength = length;
	let currentLocation = location;
	while (remainingLength > 0) {
		let memoryLocation = get(currentLocation);
		if (memoryLocation === 0) {
			break;
		}
		let amountFromThisBlock = Math.min(remainingLength, MEM_SIZE - currentLocation % MEM_SIZE);
		bufferParts.push(new Int32Array(memoryBuffer, memoryLocation, amountFromThisBlock));
		remainingLength -= amountFromThisBlock;
		currentLocation += amountFromThisBlock;
	}
	return new CombinedBuffer(bufferParts);
}

/**
 * Returns a block of memory
 * @param n the block number
 */
export function GetBlock(n: number): CombinedBuffer {
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
	let buffer = GetMemoryBuffer(location, 1);
	buffer.set([value]);
}

/**
 * Runs a command
 * @param code the command to be run: see the list above
 * @param arg the argument to the command: also see above
 */
export function syscall(code: number, arg: number): SyscallResult {
	return GetSyscallWithNumber(code)(arg);
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
	MEM_SIZE = exports.r_GetMemoryBlockSize();

	GetBlock(0).set(dsl2machine(text).slice(0, MEM_SIZE), 1);

	Trigger(Events.LOAD);
}

export function MainLoop() {
	Continue();
	RefreshBuffers();
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