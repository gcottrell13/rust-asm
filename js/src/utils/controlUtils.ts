import { ProcessorStatus } from "./enums/ProcessorStatus";
import { NMap } from "./utilTypes";
import { GetWasmExports } from "./webAssembly";
import { AddListener, Trigger } from "./debuggerEvents";
import { Events } from "./enums/Events";
import { Continue, StepOver } from "./rustUtils";
import { WriteAllBuffersToWasm } from "./language/syscalls";

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

export function StepOverProgram() {
    WriteAllBuffersToWasm();
    StepOver();
    UpdateStatusCacheWithAuthoritative();
    Trigger(Events.PAUSE);
}

// Meant for private use only

function UpdateStatusCacheWithAuthoritative() {
    status = GetWasmExports()
        .prop('r_GetProcessorStatus')
        .map(f => {
            switch (f()) {
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
        })
        .unwrap();
}


AddListener(Events.LOAD, UpdateStatusCacheWithAuthoritative);