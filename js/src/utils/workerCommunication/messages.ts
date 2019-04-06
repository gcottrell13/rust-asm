import { AllWorkers } from './comm';


export function InitializeWasm(id: string, text: string) {
	AllWorkers.messageWorker(id, {
		type: 'initialize',
		data: text,
	});
}

export function Step(id: string) {
	AllWorkers.messageWorker(id, {
		type: 'step',
	});
}