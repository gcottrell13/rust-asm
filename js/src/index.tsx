import * as React from "react";
import * as ReactDOM from "react-dom";

import { DebuggerApplication } from "./components/debugger";
import { loadWasmAsync } from "./utils/webAssembly";
import { getWasmImports } from "./utils/wasmImports";

loadWasmAsync("./dsl_wasm.wasm", getWasmImports()).then(() => {
    ReactDOM.render(
        <DebuggerApplication/>,
        document.getElementById("output")
    );
});

/**
 * 1: Build WASM Engine
 * 2: Create file loading UI
 * 3: Setup buffers for process communication
 *  wasm should be able to:
 *      setup output buffer
 *      setup input buffer
 * 4: Create terminal and graphics output 
 *  
 * 5: Setup key input for graphics
 * 
 * 6: Design and build assembler
 * 7: Design and build compiler of high level language
 */