import { Maybe, SMap } from "../utilTypes";
import * as _ from 'lodash';
import { setMemoryLocation, GetMemoryBuffer } from "../rustUtils";
import { contains } from "../generalUtils";
import { InitializeWindowBarrel } from "../windowBarrel";


// syscalls:
// 1 - init new buffer with ID from bus (so JS can reference buffer with given ID)
//      [follow with syscall 2, syscall 3, and 6]
//      IDs are shared between inputs and outputs
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

export enum BufferType {
    FROM_WASM_TERMINAL,
    FROM_WASM_DRAWING,
    FROM_WASM_FILE,
    FROM_WASM_PALETTE,
    TO_WASM,
    NONE,
}

enum Result {
    OK,
    ERROR,
}

interface Buffer {
    length: number;
    head: number;
    id: number;
    type: BufferType;
    contents: number[];
}

const buffers: SMap<Buffer> = {};

export function GetBufferOfType(type: BufferType) {
    return Maybe(_.values(buffers).filter(b => b.type === type)[0]);
}

function IsFromWasm(b: BufferType) {
    return contains([
        BufferType.FROM_WASM_DRAWING,
        BufferType.FROM_WASM_FILE,
        BufferType.FROM_WASM_PALETTE,
        BufferType.FROM_WASM_TERMINAL,
    ], b);
}

function InitBuffer(id: number) {
    return Maybe(buffers[id])
        .match({
            Just() {
                return Result.ERROR;
            },
            None() {
                buffers[id] = {
                    length: 0,
                    head: 0,
                    id,
                    type: BufferType.NONE,
                    contents: [],
                };
                return Result.OK;
            }
        }).unwrap();
}

function SetBufferStart(id: number, head: number) {
    Maybe(buffers[id])
        .filter(buffer => buffer.type === BufferType.NONE)
        .match({
            Just: buffer => {
                buffer.head = head;
                return Result.OK;
            },
            None: () => Result.ERROR,
        });
}

function SetBufferLength(id: number, length: number) {
    Maybe(buffers[id])
        .filter(buffer => buffer.type === BufferType.NONE)
        .match({
            Just: buffer => {
                buffer.length = length;
                return Result.OK;
            },
            None: () => Result.ERROR,
        });
}

function SetBufferType(id: number, type: BufferType) {
    Maybe(buffers[id])
        .filter(buffer => buffer.type === BufferType.NONE)
        .match({
            Just: buffer => {
                buffer.type = type;
                return Result.OK;
            },
            None: () => Result.ERROR,
        });
}

export function GetSyscallWithNumber(n: number) {
    switch (n) {
        case 1:
            return InitBuffer;
        case 2:
            return SetBufferStart;
        case 3:
            return SetBufferLength;
        case 6:
            return SetBufferType;
        case 7:
            return InitBuffer;
        case 8:
            return InitBuffer;
        case 9:
            return InitBuffer;
        case 10:
            return InitBuffer;
        case 11:
            return InitBuffer;
        case 12:
            return InitBuffer;
        default:
            return () => Result.ERROR;
    }
}

/**
 * All input buffers will refresh their contents
 */
export function WriteAllBuffersToWasm() {
    _.values(buffers)
        .filter(buffer => buffer.type === BufferType.TO_WASM)
        .map(buffer => {
            GetMemoryBuffer(buffer.head, buffer.length).map(array => {
                array.set(buffer.contents.slice(0, array.length));
            });
        });
}

/**
 * Puts text into a buffer that will be written to rust memory later
 * @param id buffer id
 * @param text text to put into buffer
 */
export function WriteToBuffer(id: number, text: number[]): void {
    Maybe(buffers[id])
        .filter(b => b.type === BufferType.TO_WASM)
        .match({
            Just: b => {
                b.contents = text.slice(0, b.length);
            },
        });
}

/**
 * Returns text that was read from rust memory earlier
 * @param id buffer id
 */
export function ReadFromBuffer(id: number): Maybe<number[]> {
    return Maybe(buffers[id])
        .filter(b => IsFromWasm(b.type))
        .map(b => b.contents);
}


InitializeWindowBarrel('syscalls', {
    WriteAllBuffersToWasm,
    WriteToBuffer,
    ReadFromBuffer,
    InitBuffer,
    SetBufferType,
    SetBufferLength,
    SetBufferStart,
    GetSyscallWithNumber,
    GetMemoryBuffer,
});