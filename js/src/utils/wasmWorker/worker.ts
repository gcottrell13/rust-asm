import { MainToWorker, WorkerToMain } from '../workerCommunication/formats';
import { discriminantToHandler } from '../utilTypes';
import { loadWasmAsync } from './webAssembly';
import { Initialize, GetBlock, GetInstructionPointer, SetBreakpoint, GetIsBreakpoint, RemoveBreakpoint } from './rustUtils';
import { getWasmImports } from './wasmImports';
import { GetBuffersOfType } from './syscalls';
import { StepOverProgram, ResumeProgram } from './controlUtils';
import { Sleep } from '../generalUtils';

type handler = (message: WorkerToMain, transfer?: Transferable[]) => void;

const messageTypes: discriminantToHandler<MainToWorker, 'type', handler> = {
	'add-breakpoint'(data, respond) {
		if (GetIsBreakpoint(data.line)) {
			RemoveBreakpoint(data.line);
			respond({
				type: 'updated-breakpoint',
				status: false,
			});
		}
		else {
			SetBreakpoint(data.line);
			respond({
				type: 'updated-breakpoint',
				status: true,
			});
		}
	},
	click(data, respond) {
	},
	keydown(data, respond) {

	},
	keyup(data, respond) {
		
	},
	start(data, respond) {
		ResumeProgram();
		respond({
			type: 'stopped',
			stoppedOnLine: GetInstructionPointer(),
		});
	},
	stop(data, respond) {
	},
	initialize(data, respond) {
		Initialize(data.data);
		respond({
			type: 'initialized',
		});
	},
	step(data, respond) {
		StepOverProgram();
		respond({
			type: 'stopped',
			stoppedOnLine: GetInstructionPointer(),
		});
	},
	'request-buffer'(data, respond) {
		const buffers = GetBuffersOfType(data.bufferType)
			.map(b => b.contents);
		respond(
			{
				type: 'buffer-contents',
				buffers,
			}, 
			buffers
		);
	},
	'get-block'(data, respond) {
		const block = GetBlock(data.blockNum).getCombined();
		respond(
			{
				type: 'block',
				block,
			},
			[block]
		);
	},

	ping(_, respond) {
		respond({
			type: 'pong',
		});
	},
};

//#region setup handler

export async function setupWorker(ctx: Worker) {
	ctx.onmessage = ev => messageTypes[(ev.data as MainToWorker).type](
		ev.data as any,
		(msg, transfer) => ctx.postMessage(msg, transfer)
	);

	await loadWasmAsync('./wasm/dsl_wasm.wasm', getWasmImports());
	await Sleep(100);

	ctx.postMessage({
		type: 'worker-ready',
	});
}

//#endregion