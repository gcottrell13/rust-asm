import * as React from "react";
import * as ReactDOM from "react-dom";

import { DebuggerApplication } from "./components/debugger";
import { loadWasmAsync, GetWasmExports } from "./utils/webAssembly";
import { getWasmImports } from "./utils/wasmImports";

loadWasmAsync("./dsl_wasm.wasm", getWasmImports()).then(() => {
    
    ReactDOM.render(
        <DebuggerApplication/>,
        document.getElementById("output")
    );
});