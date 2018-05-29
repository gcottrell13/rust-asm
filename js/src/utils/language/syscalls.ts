import { NMap } from "../utilTypes";
import { GetMemoryLocation, setMemoryLocation } from "../rustUtils";

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

function NewBuffer(id: number) {
    if (!buffers[id]) {
        buffers[id] = {
            length: 0,
            head: 0,
            id,
            type: BufferType.NONE,
            contents: [],
        };
        return Result.OK;
    }
    return Result.ERROR;
}

export const Syscall = {
    InitBuffer: (id: number) => {
        return NewBuffer(id);
    },
    SetBufferStart: (id: number, head: number) => {
        if (buffers[id] && buffers[id].type === BufferType.NONE) {
            buffers[id].head = head;
            return Result.OK;
        }
        return Result.ERROR;
    },
    SetBufferLength: (id: number, length: number) => {
        if (buffers[id] && buffers[id].type === BufferType.NONE) {
            buffers[id].length = length;
            return Result.OK;
        }
        return Result.ERROR;
    },
    SetBufferAsInput: (id: number) => {
        if (buffers[id] && buffers[id].type === BufferType.NONE) {
            buffers[id].type = BufferType.TO_WASM;
            return Result.OK;
        }
        return Result.ERROR;
    },
    SetBufferAsOutput: (id: number) => {
        if (buffers[id] && buffers[id].type === BufferType.NONE) {
            buffers[id].type = BufferType.FROM_WASM;
            return Result.OK;
        }
        return Result.ERROR;
    },
};

export function GetSyscallWithNumber(n: number) {
    switch (n) {
        case 1:
            return Syscall.InitBuffer;
        case 2:
            return Syscall.SetBufferStart;
        case 3:
            return Syscall.SetBufferLength;
        case 4:
            return Syscall.SetBufferAsInput;
        case 5:
            return Syscall.SetBufferAsOutput;
        case 6:
            return Syscall.InitBuffer;
        case 7:
            return Syscall.InitBuffer;
        case 8:
            return Syscall.InitBuffer;
        case 9:
            return Syscall.InitBuffer;
        case 10:
            return Syscall.InitBuffer;
        case 11:
            return Syscall.InitBuffer;
        case 12:
            return Syscall.InitBuffer;
        default:
            return () => Result.ERROR;
    }
}

/**
 * All input buffers will refresh their contents
 */
export function WriteAllBuffersToWasm() {
    for (let e in buffers) {
        let buffer = buffers[e]

        if (buffer.type === BufferType.TO_WASM) {
            // TODO: a better way to do this
            for (let index = buffer.head, c_index = 0; c_index < buffer.length; index++ , c_index++) {
                setMemoryLocation(index, buffer.contents[c_index]);
            }
        }
    }
}

export function WriteToBuffer(id: number, text: number[]): void {
    if (buffers[id]) {
        var buffer = buffers[id];
        if (buffer.type === BufferType.TO_WASM)
            buffer.contents = text.slice(0, buffer.length);
    }
}

export function ReadFromBuffer(id: number): number[] | null {
    if (buffers[id]) {
        var buffer = buffers[id];
        if (buffer.type === BufferType.FROM_WASM)
            return buffer.contents;
    }
    return null;
}