import { BufferType } from './syscalls';

export type MainToWorker = {
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
};

export type WorkerToMain = {
	type: 'stopped',
	stoppedOnLine: number;
} | {
	type: 'ack-start',
} | {
	type: 'ack-stop',
} | {
	type: 'buffer-contents',
	buffer: Uint32Array,
	bufferType: BufferType;
} | {
	type: 'initialized',
} | {
	type: 'error',
	message: string,
};