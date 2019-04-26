import { MainToWorker, WorkerToMain } from '../workerCommunication/formats';
import { discriminantToHandler, stripKeyFromAll, getPropsOf } from '../utilTypes';
import { loadWasmAsync } from './webAssembly';
import { Initialize, GetBlock, GetInstructionPointer, SetBreakpoint, GetIsBreakpoint, RemoveBreakpoint } from './rustUtils';
import { getWasmImports } from './wasmImports';
import { GetBuffersOfType } from './syscalls';
import { StepOverProgram, ResumeProgram } from './controlUtils';


type wtm = stripKeyFromAll<getPropsOf<WorkerToMain, 'type'>, 'type'>;

type handler = <T extends WorkerToMain['type']>(t: T, message: wtm[T], transfer?: Transferable[]) => void;

const messageTypes: discriminantToHandler<MainToWorker, 'type', handler> = {
	'add-breakpoint'(data, respond) {
		if (GetIsBreakpoint(data.line)) {
			RemoveBreakpoint(data.line);
			respond('updated-breakpoint', {
				status: false,
			});
		}
		else {
			SetBreakpoint(data.line);
			respond('updated-breakpoint', {
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
		respond('stopped', {
			stoppedOnLine: GetInstructionPointer(),
		});
	},
	stop(data, respond) {
	},
	initialize(data, respond) {
		loadWasmAsync('./wasm/dsl_wasm.wasm', getWasmImports()).then(() => {
			Initialize(data.data);
			respond('initialized', {});
		});
	},
	step(data, respond) {
		StepOverProgram();
		respond('stopped', {
			stoppedOnLine: GetInstructionPointer(),
		});
	},
	'request-buffer'(data, respond) {
		const buffers = GetBuffersOfType(data.bufferType)
			.map(b => b.contents);
		respond(
			'buffer-contents',
			{
				buffers,
			}, 
			buffers
		);
	},
	'get-block'(data, respond) {
		const block = new Uint32Array(GetBlock(data.blockNum).getCombined()).buffer;
		respond(
			'block',
			{
				block,
			},
			[block]
		);
	},

	ping(_, respond) {
		respond('pong', {});
	},
};

//#region setup handler

export async function setupWorker(ctx: Worker) {
	ctx.onmessage = ev => messageTypes[(ev.data as MainToWorker).type](
		ev.data as any,
		(type, msg, transfer) => ctx.postMessage(
			{
				type,
				...msg,
			}, 
			transfer)
	);
}

//#endregion