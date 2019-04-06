import { MainToWorker } from '../wasmWorker/formats';
import { SMap } from '../utilTypes';

class Workers {
	private _id: number = 0;
	private _workers: SMap<Worker> = {};

	public createWorker(): string {
		const worker = new Worker('worker.js');
		const id = this._id ++;

		this._workers[id] = worker;
		return String(id);
	}

	public getIds(): string[] {
		return Object.keys(this._workers);
	}

	public messageWorker(id: string, message: MainToWorker, transfer?: Transferable[]) {
		const worker = this._workers[id];
		if (!worker)
			throw new Error(`Worker ${id} not found!`);
		worker.postMessage(message, transfer);
	}

	public killWorker(id: string) {
		const worker = this._workers[id];
		if (!worker)
			throw new Error(`Worker ${id} not found!`);
		worker.terminate();
		delete this._workers[id];
	}

}

export const AllWorkers = new Workers();