import { AllWorkers } from './comm';
import { BufferType } from '../wasmWorker/syscalls';
import { InitializeWindowBarrel } from '../windowBarrel';

async function UpdateBuffers(id: string) {
	const screenBuffers = await AllWorkers.messageWorker(id, 'request-buffer', {
		bufferType: BufferType.OUTPUT_SCREEN,
	})('buffer-contents');
}

export async function InitializeWasmAsync(id: string, text: string) {
	const waitfor = AllWorkers.messageWorker(id, 'initialize', {
		data: text,
	});
	await waitfor('initialized');
}

export async function StepAsync(id: string) {
	const result = await AllWorkers.messageWorker(id, 'step', {
	})('stopped');
	await UpdateBuffers(id);
	return result;
}

export async function RunAsync(id: string) {
	const result = await AllWorkers.messageWorker(id, 'start', {
	})('stopped');
	await UpdateBuffers(id);
	return result;
}

export async function RequestBlockAsync(id: string, blockNum: number): Promise<number[] | null> {
	const result = await AllWorkers.messageWorker(id, 'get-block', {
		blockNum,
	})('block');
	if (result && result.block) {
		const block = new Uint32Array(result.block);
		return [... block];
	}
	return null;
}

export async function SetBreakpointAsync(id: string, b: number) {
	const result = await AllWorkers.messageWorker(id, 'add-breakpoint', {
		line: b,
	})('updated-breakpoint');
	if (result) 
		return result.status;
	return false;
}

export async function PingWorkerAsync(id: string) {
	return await AllWorkers.messageWorker(id, 'ping', {
	})('pong');
}

InitializeWindowBarrel('workerMessages', {
	getIds: AllWorkers.getIds,
	RequestBlockAsync,
	StepAsync,
	PingWorkerAsync,
});