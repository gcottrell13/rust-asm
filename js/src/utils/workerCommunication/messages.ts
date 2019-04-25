import { AllWorkers } from './comm';
import { BufferType } from '../wasmWorker/syscalls';
import { InitializeWindowBarrel } from '../windowBarrel';

async function UpdateBuffers(id: string) {
	const screenBuffers = await AllWorkers.messageWorker(id, {
		type: 'request-buffer',
		bufferType: BufferType.OUTPUT_SCREEN,
	})('buffer-contents');
}

export async function InitializeWasmAsync(id: string, text: string) {
	const waitfor = AllWorkers.messageWorker(id, {
		type: 'initialize',
		data: text,
	});
	await waitfor('initialized');
}

export async function StepAsync(id: string) {
	const result = await AllWorkers.messageWorker(id, {
		type: 'step',
	})('stopped');
	await UpdateBuffers(id);
	return result;
}

export async function RunAsync(id: string) {
	const result = await AllWorkers.messageWorker(id, {
		type: 'start',
	})('stopped');
	await UpdateBuffers(id);
	return result;
}

export async function RequestBlockAsync(id: string, blockNum: number) {
	return await AllWorkers.messageWorker(id, {
		type: 'get-block',
		blockNum,
	})('block');
}

export async function SetBreakpoint(id: string, b: number) {
	const result = await AllWorkers.messageWorker(id, {
		type: 'add-breakpoint',
		line: b,
	})('updated-breakpoint');
	if (result) 
		return result.status;
	return false;
}

export async function PingWorkerAsync(id: string) {
	return await AllWorkers.messageWorker(id, {
		type: 'ping',
	})('pong');
}

InitializeWindowBarrel('workerMessages', {
	getIds: AllWorkers.getIds,
	RequestBlockAsync,
	StepAsync,
	PingWorkerAsync,
});