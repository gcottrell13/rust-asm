import { NMap, Maybe } from "../utilTypes";
import * as _ from 'lodash';
import { setMemoryLocation, GetMemoryBuffer } from "../rustUtils";
import { contains } from "../generalUtils";

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

const buffers: NMap<Buffer> = {};

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


(window as any).Syscall = {
    WriteAllBuffersToWasm,
    WriteToBuffer,
    ReadFromBuffer,
    InitBuffer,
    SetBufferType,
    SetBufferLength,
    SetBufferStart,
    GetSyscallWithNumber,
    GetMemoryBuffer,
};