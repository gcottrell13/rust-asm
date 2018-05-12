import { ProcessorStatus } from "./enums/ProcessorStatus";
import { NMap } from "./utilTypes";
import { GetWasmExports } from "./webAssembly";

let status: ProcessorStatus = ProcessorStatus.Empty;

/**
 * Returns the JS cached status
 */
export function GetStatus() {
    return status;
}


export function CheckStatus(targets: ProcessorStatus[]) {
    let status = GetStatus();

    return targets.findIndex(t => t === status) !== -1;
}

/**
 * Starts the program if it is NotStarted already.
 */
export function StartProgram() {
    if (!CheckStatus([ProcessorStatus.NotStarted])) return;


}

/**
 * TODO: implement
 */
export function PauseProgram() {

}




// Meant for private use only

/**
 * Queries the rust processor status.
 */
function GetProcessorStatus() {
    let exports = GetWasmExports();
    let status = exports.r_GetProcessorStatus();
    switch(status) {
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
    }
}
function UpdateStatusCacheWithAuthoritative () {
    status = GetProcessorStatus();
}