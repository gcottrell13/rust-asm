import { MainToWorker } from './formats';
import { discriminantToHandler } from '../utilTypes';


const messageTypes: discriminantToHandler<MainToWorker, 'type'> = {
	'add-breakpoint'(data) {

	},
	click(data) {

	},
	keydown(data) {

	},
	keyup(data) {

	},
	start(data) {

	},
	stop(data) {
	},
	initialize(data) {
	},
	step(data) {

	},
};

//#region setup handler

export function setupWorker(ctx: Worker) {
	ctx.onmessage = ev => _onmessage(ev.data as MainToWorker);
}
function _onmessage(data: MainToWorker) {
	messageTypes[data.type](data as any);
}

//#endregion