import { setupWorker } from './utils/wasmWorker/worker';

setupWorker((typeof self !== 'undefined' ? self : this) as any);