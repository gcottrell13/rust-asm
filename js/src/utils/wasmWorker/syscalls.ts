import { Maybe, SMap, Either } from '../utilTypes';
import * as _ from 'lodash';
import { GetMemoryBuffer } from './rustUtils';
import { contains } from '../generalUtils';
import { InitializeWindowBarrel } from '../windowBarrel';

// -----------------------------------------------------------------------
//#region Descriptions of syscalls + enum
// -----------------------------------------------------------------------

enum syscalls {
	/**
	 * init new buffer with ID from bus (so JS can reference buffer with given ID)
	 * [follow with syscall 2, syscall 3, and 6]
	 * IDs are shared between inputs and outputs
	 */
	CreateBuffer = 1,

	SetBufferHead = 2,
	SetBufferLength = 3,
	SetBufferType = 4,

	DeleteBuffer = 5,

	/**
	 * File stuff
	 */


	/**
	 * Other
	 */
	Sleep = 20,
}

// syscalls:
// 1 - Create a new buffer
// 2 - initialize newest buffer start (param address)
// 3 - initialize newest buffer length (param length)
// 6 - initialize newest buffer type:
//      See below for types and uses of buffer types.
//      All buffers are immutable and the JS will ignore attempts to change buffer
//      properties.
// 7 - clear buffer with ID from bus (JS drops buffer)
// 9 - ready file with filename pointer (param address) 
//      [follow with syscall 10]
// 10 - load file contents into buffer with ID from bus (must be an input buffer)
// 11 - submit a request to sleep (param ms time) [should follow up with pause]

// Buffer types
// All input buffer types update between frames
/* 1 - [INPUT] Key input
    In each position, put the key code of the key to listen for.
    Do this BEFORE initalizing the buffer, as the JS will overrwrite values
    as soon as it is able.
    The JS will then set all values to the following:
        0 if the key is not pressed
        1 if the key is pressed
*/
/* 2 - [INPUT] Terminal input
    The buffer will be filled with the most recent text that
    was not consumed. The JS will follow this logic for filling
    this buffer:
        The buffer will be considered empty only if:
            The first position in the buffer is 0.
            This must be done by the wasm.
        If the buffer is empty:
            The buffer will be filled with as much text
            as the JS currently has. If the buffer is not large
            enough, the JS will stop filling the buffer,
            and the remaining text will be saved until the
            next update.
        If the buffer is not empty:
            The JS will do nothing, and will continue to
            accumulate text in its own internal buffer.
*/
/* 3 - [OUTPUT] Color Palette
    This buffer is broken up in chunks of 3 for RGB.
    If the buffer length is not a multiple of 3, any positions
    that are remainder will be ignored, giving an effective buffer
    length of floor(bufferLength / 3).
    
    All values will be used by the JS modulo 256.

    The values will be used by the Screen Output buffer by specifying
    the index of a color. For example, color 1 refers to the second triplet
    of color values.

*/
/* 4 - [OUTPUT] Screen Output
    Buffer should be a length equal to the product of the specified screen
    length and width.
    Any longer, and extra data will be ignored.
    Any shorter, and there will be empty portions of the screen.
    Any values that do not correspond to a color triplet in the Palette will
        be empty on the screen.

*/
/* 5 - [OUTPUT] Screen size
    This buffer should have a size of 2: width and height.
    If this buffer is not specified, a default screen size will be used.
    200w x 200h
*/
/* 6 - [OUTPUT] File


*/
/* 7 - [INPUT] File


*/

// -----------------------------------------------------------------------
//#endregion
//#region Interfaces
// -----------------------------------------------------------------------

const buffers: SMap<Buffer> = {};

let bufferCreateId = 0;

const _zeroBuffer = new Uint32Array();

export type SyscallFunction = (parameter: number) => SyscallResult;

export enum BufferType {
	INPUT_KEY = 1,
	INPUT_TERMINAL = 2,
	OUTPUT_PALETTE = 3,
	OUTPUT_SCREEN = 4,
	OUTPUT_SCREEN_SIZE = 5,
	NONE = 100,
}

export enum SyscallResult {
	OK = 0,
	ERROR = 1,
}

interface Buffer {
	length: number;
	head: number;
	id: number;
	type: BufferType;
	contents: Uint32Array;

	lengthInitialized: boolean;
	headInitialized: boolean;
	typeInitialized: boolean;
}

// -----------------------------------------------------------------------
//#endregion
//#region Helper function
// -----------------------------------------------------------------------

export function GetBufferOfType(type: BufferType) {
	return Maybe(_.values(buffers).filter(b => b.type === type)[0]);
}

export function GetBuffersOfType(type: BufferType) {
	return _.values(buffers).filter(b => b.type === type);
}

function IsFromWasm(buffer: Buffer) {
	return contains(
		[
			BufferType.OUTPUT_PALETTE,
			BufferType.OUTPUT_SCREEN,
			BufferType.OUTPUT_SCREEN_SIZE,
		], 
		buffer.type
	);
}

function IsToWasm(buffer: Buffer) {
	return contains(
		[
			BufferType.INPUT_KEY,
			BufferType.INPUT_TERMINAL,
		], 
		buffer.type
	);
}

function IsBufferInitialized(buffer: Buffer) {
	return buffer.headInitialized && buffer.lengthInitialized && buffer.typeInitialized;
}

// -----------------------------------------------------------------------
//#endregion
//#region Syscall functions
// -----------------------------------------------------------------------

function CreateBuffer(): SyscallResult {
	bufferCreateId += 1;
	buffers[bufferCreateId] = {
		length: 0,
		head: 0,
		id: bufferCreateId,
		type: BufferType.NONE,
		contents: _zeroBuffer,
		headInitialized: false,
		lengthInitialized: false,
		typeInitialized: false,
	};
	return SyscallResult.OK;
}

function SetBufferHead(head: number): SyscallResult {
	return Maybe(buffers[bufferCreateId])
		.filter(buffer => !buffer.headInitialized)
		.match({
			Just(buffer) {
				buffer.head = head;
				buffer.headInitialized = true;
			},
		})
		.map(b => SyscallResult.OK)
		.else(() => SyscallResult.ERROR)
		.unwrap();
}

function SetBufferLength(length: number): SyscallResult {
	return Maybe(buffers[bufferCreateId])
		.filter(buffer => !buffer.lengthInitialized)
		.match({
			Just(buffer) {
				buffer.length = length;
				buffer.lengthInitialized = true;
				buffer.contents = new Uint32Array(length);
			},
		})
		.map(b => SyscallResult.OK)
		.else(() => SyscallResult.ERROR)
		.unwrap();
}

function SetBufferType(type: BufferType): SyscallResult {
	return Maybe(buffers[bufferCreateId])
		.filter(buffer => !buffer.typeInitialized)
		.match({
			Just(buffer) {
				buffer.type = type;
				buffer.typeInitialized = true;
			},
		})
		.map(b => SyscallResult.OK)
		.else(() => SyscallResult.ERROR)
		.unwrap();
}

function Sleep(): SyscallResult {
	return SyscallResult.ERROR;
}

// -----------------------------------------------------------------------
//#endregion
//#region Map syscall numbers to functions
// -----------------------------------------------------------------------

const _allSyscalls: SMap<SyscallFunction> = {
	CreateBuffer,
	SetBufferHead,
	SetBufferLength,
	SetBufferType,
	Sleep,
};

/**
 * Maps the given syscall code to the appropriate function
 * @param n
 */
export function GetSyscallWithNumber(n: syscalls): SyscallFunction {
	const name = syscalls[n];
	if (name in _allSyscalls) {
		return _allSyscalls[name];
	}
	return () => SyscallResult.ERROR;
}

// -----------------------------------------------------------------------
//#endregion
//#region Write/Read all buffers to/from wasm
// -----------------------------------------------------------------------

/**
 * All input buffers will refresh their contents
 */
function WriteAllBuffersToWasm() {
	_.values(buffers)
		.filter(IsToWasm)
		.filter(IsBufferInitialized)
		.map(_writeIntoWasm);
}

function ReadAllBuffersFromWasm() {
	_.values(buffers)
		.filter(IsFromWasm)
		.filter(IsBufferInitialized)
		.forEach(_readIntoLocal);
}

// -----------------------------------------------------------------------
//#endregion
//#region Write/Read one buffer 
// -----------------------------------------------------------------------

/**
 * Puts text into a buffer that will be written to rust memory later
 * @param id buffer id
 * @param text text to put into buffer
 */
export function WriteToBuffer(bufferId: number, text: Int32Array) {
	Maybe(buffers[bufferId])
		.filter(IsToWasm)
		.filter(IsBufferInitialized)
		.map(buffer => buffer.contents.set(text.slice(0, buffer.length)));
}

/**
 * Returns text that was read from rust memory earlier
 * @param id buffer id
 */
export function ReadFromBuffer(bufferId: number): Maybe<Uint32Array> {
	return Maybe(buffers[bufferId])
		.filter(IsFromWasm)
		.filter(IsBufferInitialized)
		.map(buffer => buffer.contents);
}

function _readIntoLocal(buffer: Buffer) {
	buffer.contents.set(GetMemoryBuffer(buffer.head, buffer.length).getCombined());
}

function _writeIntoWasm(buffer: Buffer) {
	GetMemoryBuffer(buffer.head, buffer.length).set(buffer.contents);
}


// -----------------------------------------------------------------------
//#endregion
//#region Export to refresh buffers
// -----------------------------------------------------------------------

export function RefreshBuffers() {
	WriteAllBuffersToWasm();
	ReadAllBuffersFromWasm();
}

// -----------------------------------------------------------------------
//#endregion