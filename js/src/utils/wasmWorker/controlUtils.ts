import { ProcessorStatus } from './enums/ProcessorStatus';
import { GetWasmExports } from './webAssembly';
import { AddListener, Trigger, RemoveListener } from '../debuggerEvents';
import { Events } from './enums/Events';
import { Continue, StepOver } from './rustUtils';
import { RefreshBuffers } from './syscalls';

let status: ProcessorStatus = ProcessorStatus.Empty;

export function CheckStatus(targets: ProcessorStatus[]) {
	return targets.findIndex(t => t === status) !== -1;
}

/**
 * Starts the program if it is NotStarted already.
 */
export function StartProgram() {
	if (!CheckStatus([ProcessorStatus.NotStarted])) return;
	Continue();
}

/**
 * TODO: implement
 */
export function PauseProgram() {

}

export function ResumeProgram() {
	
}

export function StepOverProgram() {
	RefreshBuffers();
	StepOver();
	UpdateStatusCacheWithAuthoritative();
	switch (status) {
		case ProcessorStatus.Halted:
			Trigger(Events.HALT);
			break;
		case ProcessorStatus.Paused:
			Trigger(Events.PAUSE);
			break;
		case ProcessorStatus.Running:
			Trigger(Events.CONTINUE);
			break;
		case ProcessorStatus.Unknown:
			Trigger(Events.UNKNOWN);
			break;
	}
}

// Meant for private use only

function UpdateStatusCacheWithAuthoritative() {
	status = (() => {
		switch (GetWasmExports().r_GetProcessorStatus()) {
			case 0:
				return ProcessorStatus.Paused;
			case 1:
				return ProcessorStatus.Halted;
			case 2:
				return ProcessorStatus.NotStarted;
			case 3:
				return ProcessorStatus.Running;
			case 4:
				return ProcessorStatus.Empty;
			default:
				return ProcessorStatus.Unknown;
		}
	})();
	RemoveListener(Events.LOAD, UpdateStatusCacheWithAuthoritative);
}


AddListener(Events.LOAD, UpdateStatusCacheWithAuthoritative);
