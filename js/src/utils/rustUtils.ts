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

let MEM_SIZE = 1024 * 32;

class CombinedArray {
	private subarrays: Uint32Array[];
	private _length: number;

	constructor(initial: Uint32Array[]) {
		this._length = initial.reduce((sum, arr) => sum + arr.length, 0);
		this.subarrays = initial;
	}

	private aggregateSubarrays(): Uint32Array {
		if (this.subarrays.length === 1) {
			return this.subarrays[0];
		}

		const combined = new Uint32Array(length);

		let offset = 0;
		this.subarrays.forEach((element) => {
			combined.set(element, offset);
			offset += element.length;
		});
		return combined;
	}

	set(array: CombinedArray, offset?: number): void;
	set(array: Uint32Array, offset?: number): void;
	set(array: ArrayLike<number>, offset?: number): void;
	set(array: CombinedArray | Uint32Array | ArrayLike<number>, offset: number = 0): void {
		if (array instanceof CombinedArray) {
			this._set(array.getCombined(), offset);
		}
		else {
			this._set(new Uint32Array(array), offset);
		}
	}

	_set(array: CombinedArray, start: number): void;
	_set(array: Uint32Array, start: number): void;
	_set(_array: Uint32Array | CombinedArray, start: number) {
		if (start < 0 || start > this.length) {
			throw new Error('invalid or out-of-range index');
		}
		if (start + _array.length > this.length) {
			throw new Error('invalid array length');
		}

		const array = _array instanceof CombinedArray ? _array : new CombinedArray([_array]);

		if (this.subarrays.length === 1) {
			this.subarrays[0].set(array.getCombined(), start);
			return;
		}

		let consumed = 0;
		let subarrayIndex = 0;
		let aggregateLength = 0;
		while (subarrayIndex < this.subarrays.length && consumed < array.length) {
			const subarray = this.subarrays[subarrayIndex++];

			if (consumed === 0) {
				if (aggregateLength + subarray.length > start) {
					// we start copying in this subarray
					const thisOffset = start - aggregateLength;
					consumed = subarray.length - thisOffset;
					subarray.set(array.subarray(0, consumed).getCombined(), thisOffset);
				}
				else {
					aggregateLength += subarray.length;
				}
			}
			else {
				const remainingSourceLengthForThisStep = array.length - consumed;
				const consumedInThisStep = Math.min(remainingSourceLengthForThisStep, subarray.length);
				subarray.set(array.subarray(consumed, consumedInThisStep).getCombined());
				consumed += consumedInThisStep;
			}
		}
	}

	subarray(start: number, count: number = -1): CombinedArray {
		if (start >= this.length) {
			throw new Error('invalid start');
		}
		if (count < 0) {
			count = this.length;
		}

		if (this.subarrays.length === 1) {
			return new CombinedArray([this.subarrays[0].subarray(start, start + count)]);
		}
		if (this.subarrays.length === 0) {
			return this;
		}

		let offset = 0;
		let produced = 0;
		const arrays: Uint32Array[] = [];
		for (let i = 0; i < this.subarrays.length && produced < count; i++) {
			const subarray = this.subarrays[i];

			if (start < offset + subarray.length) {
				// the first array
				produced = subarray.length - (start - offset);
				arrays.push(subarray.subarray(start - offset));
			}
			else if (produced > 0) {
				if (count - produced < subarray.length) {
					arrays.push(subarray.subarray(0, count - produced));
				}
				else {
					arrays.push(subarray);
					produced += subarray.length;
				}
			}

			offset += subarray.length;
		}
		return new CombinedArray(arrays);
	}

	getCombined(): Uint32Array {
		return this.aggregateSubarrays();
	}
	
	get length(): number {
		return this._length;
	}

	*[Symbol.iterator](): Iterator<number> {
		for (let i = 0; i < this.subarrays.length; i++) {
			const s = this.subarrays[i];
			for (let key in s) {
				yield s[key];
			}
		}
	}
}

export function GetMemoryBuffer(location: number, length: number): CombinedArray {
	const get = GetWasmExports().r_GetWasmMemoryLocation;
	const memoryBuffer = GetWasmExports().memory.buffer;
	const bufferParts: Uint32Array[] = [];

	let remainingLength = length;
	let currentLocation = location;
	while (remainingLength > 0) {
		let memoryLocation = get(currentLocation);
		if (memoryLocation === 0) {
			break;
		}
		let amountFromThisBlock = Math.min(remainingLength, MEM_SIZE - currentLocation % MEM_SIZE);
		bufferParts.push(new Uint32Array(memoryBuffer, memoryLocation, amountFromThisBlock));
		remainingLength -= amountFromThisBlock;
		currentLocation += amountFromThisBlock;
	}
	return new CombinedArray(bufferParts);
}

/**
 * Returns a block of memory
 * @param n the block number
 */
export function GetBlock(n: number): CombinedArray {
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
	CombinedArray,
});