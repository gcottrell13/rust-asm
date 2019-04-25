import { BufferType } from '../wasmWorker/syscalls';

export type MainToWorker = {
	type: 'ping',
} | {
	type: 'add-breakpoint';
	line: number;
} | {
	type: 'click';
	x: number;
	y: number;
} | {
	type: 'keydown';
	key: string;
} | {
	type: 'keyup';
	key: string;
} | {
	// start the machine
	type: 'start',
} | {
	// stop the machine
	type: 'stop',
} | {
	// initialize the machine with data
	type: 'initialize',
	data: string,
} | {
	// the machine will perform one command before stopping again
	type: 'step',
} | {
	type: 'request-buffer',
	bufferType: BufferType,
	// responds with 'buffer-contents'
} | {
	type: 'get-block',
	blockNum: number,	
};

export type WorkerToMain = {
	type: 'worker-ready',
} | {
	type: 'stopped',
	stoppedOnLine: number;
} | {
	type: 'buffer-contents',
	buffers: Uint32Array[],
} | {
	type: 'initialized',
} | {
	type: 'error',
	message: string,
} | {
	type: 'block',
	block: Uint32Array | null,
} | {
	type: 'updated-breakpoint',
	status: boolean;
} | {
	type: 'pong',
};