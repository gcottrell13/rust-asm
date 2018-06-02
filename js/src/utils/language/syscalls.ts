import { NMap, Maybe } from "../utilTypes";
import * as _ from 'lodash';
import { setMemoryLocation, GetMemoryBuffer } from "../rustUtils";

enum BufferType {
    FROM_WASM,
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

const buffers: NMap<Buffer> = {};

function InitBuffer(id: number) {
    return Maybe(buffers[id])
        .match(() => Result.ERROR, () => {
            buffers[id] = {
                length: 0,
                head: 0,
                id,
                type: BufferType.NONE,
                contents: [],
            };
            return Result.OK;
        }).unwrap();
}

function SetBufferStart(id: number, head: number) {
    Maybe(buffers[id])
        .filter(buffer => buffer.type === BufferType.NONE)
        .on(buffer => buffer.head = head)
        .match(() => Result.OK, () => Result.ERROR);
}

function SetBufferLength(id: number, length: number) {
    Maybe(buffers[id])
        .filter(buffer => buffer.type === BufferType.NONE)
        .on(buffer => buffer.length = length)
        .match(() => Result.OK, () => Result.ERROR);
}

function SetBufferAsInput(id: number) {
    Maybe(buffers[id])
        .filter(buffer => buffer.type === BufferType.NONE)
        .on(buffer => buffer.type = BufferType.TO_WASM)
        .match(() => Result.OK, () => Result.ERROR);
}

function SetBufferAsOutput(id: number) {
    Maybe(buffers[id])
        .filter(buffer => buffer.type === BufferType.NONE)
        .on(buffer => buffer.type = BufferType.FROM_WASM)
        .match(() => Result.OK, () => Result.ERROR);
}

export function GetSyscallWithNumber(n: number) {
    switch (n) {
        case 1:
            return InitBuffer;
        case 2:
            return SetBufferStart;
        case 3:
            return SetBufferLength;
        case 4:
            return SetBufferAsInput;
        case 5:
            return SetBufferAsOutput;
        case 6:
            return InitBuffer;
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
        .on(b => {
            b.contents = text.slice(0, b.length);
        });
}

/**
 * Returns text that was read from rust memory earlier
 * @param id buffer id
 */
export function ReadFromBuffer(id: number): Maybe<number[]> {
    return Maybe(buffers[id])
        .filter(b => b.type === BufferType.FROM_WASM)
        .map(b => b.contents);
}


(window as any).Syscall = {
    WriteAllBuffersToWasm,
    WriteToBuffer,
    ReadFromBuffer,
    InitBuffer,
    SetBufferAsInput,
    SetBufferAsOutput,
    SetBufferLength,
    SetBufferStart,
    GetSyscallWithNumber,
    GetMemoryBuffer,
};