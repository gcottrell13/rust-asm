import { MainToWorker, WorkerToMain } from './formats';
import { SMap, DiscriminateUnion, getPropsOf, stripKeyFromAll } from '../utilTypes';
import { get } from '../get';
import { PingWorkerAsync } from './messages';

type mtw = stripKeyFromAll<getPropsOf<MainToWorker, 'type'>, 'type'>;

type responseListener = (arg: WorkerToMain) => void;

interface PublicWorkers {

	createWorker(): string;
	getIds(): string[];
	messageWorker<T extends MainToWorker['type']>(id: string, t: T, message: mtw[T], transfer?: Transferable[]):
		<T extends WorkerToMain['type']>(waitFor: T, timeout?: number) => Promise<DiscriminateUnion<WorkerToMain, 'type', T> | null>;
	killWorker(id: string): void;

}

class Workers implements PublicWorkers {
	private _id: number = 0;
	private _workers: SMap<Worker> = {};
	private _workerEvents: SMap<SMap<responseListener[]>> = {};

	public createWorker(): string {
		const worker = new Worker('wasm.worker.bundle.js');
		const id = this._id++;

		worker.onmessage = (ev: MessageEvent) => {
			const queue = get(
				this._workerEvents,
				wq => wq[id],
				e => e[(ev.data as WorkerToMain).type]
			);
			if (queue) {
				this._workerEvents[id][ev.data.type] = [];
				queue.forEach(x => x(ev.data));
			}
		};

		worker.onerror = (ev: ErrorEvent) => {
			console.log(ev);
		};

		this._workers[id] = worker;
		return String(id);
	}

	public getIds(): string[] {
		return Object.keys(this._workers);
	}

	public messageWorker<T extends MainToWorker['type']>(id: string, type: T, message: mtw[T], transfer?: Transferable[]) {
		const worker = this._workers[id];
		if (!worker)
			throw new Error(`Worker ${id} not found!`);
		worker.postMessage(
			{
				type,
				...message,
			},
			transfer
		);

		// return a function that can be used to wait for a particular response
		return <T extends WorkerToMain['type']>(waitFor: T, timeout: number = 500): Promise<DiscriminateUnion<WorkerToMain, 'type', T> | null> => {
			return new Promise((resolve) => {
				const t = setTimeout(() => resolve(null), timeout);
				this.addExpectedResponse(id, waitFor, (wtm) => {
					resolve(wtm as any);
					clearTimeout(t);
				});
			});
		};
	}

	public killWorker(id: string) {
		const worker = this._workers[id];
		if (!worker)
			throw new Error(`Worker ${id} not found!`);
		worker.terminate();
		delete this._workers[id];
	}


	public addExpectedResponse<T extends WorkerToMain['type']>(id: string, waitfor: T, response: responseListener) {

		if (this._workerEvents[id] === undefined) {
			this._workerEvents[id] = {};
		}
		const workerEvents = this._workerEvents[id];
		if (workerEvents[waitfor] === undefined) {
			workerEvents[waitfor] = [];
		}

		workerEvents[waitfor].push(response);
	}
}

const _allWorkers = new Workers();
export const AllWorkers: PublicWorkers = _allWorkers;


// import { useEffect, useState } from 'react';
export async function createWebworkerAsync() {
	const id = _allWorkers.createWorker();
	console.log('Created worker', id);
	await PingWorkerAsync(id);
	return id;
}