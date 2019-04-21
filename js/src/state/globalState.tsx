import React from 'react';
import { GlobalStateProvider, useGlobalState } from '../components/utils/globalState';

/**
 * The interface that defines global state for the program
 */
export interface DslWasmGlobalState {
	dslCompiled: string;
	activeWorkers: string[];
}

/**
 * The official wrapper of useGlobalState
 * @param key
 */
export function useGlobalDslWasmState<TKey extends keyof DslWasmGlobalState>(key: TKey)  {
	return useGlobalState<DslWasmGlobalState[TKey]>(key);
}



//#region Wrappers for global state provider

interface DslWasmStateProviderProps extends DslWasmGlobalState {
	children: any;
}

export function DslWasmStateProvider({ children, ...state }: DslWasmStateProviderProps) {
	return <GlobalStateProvider<DslWasmGlobalState> initialValue={state}>{children}</GlobalStateProvider>;
}
//#endregion
