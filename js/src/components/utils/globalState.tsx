import React, {
	createContext,
	useState,
	useContext,
	useMemo,
	useCallback, ReactNode,
} from 'react';
import { SMap } from '../../utils/utilTypes';

let globals: SMap<GlobalState>;

//#region Types and Interfaces

interface Action<T> {
	type: string;
}

interface GlobalState {
	context: React.Context<any>;
	value: any;
}

type PayloadValue<T> = [T, React.Dispatch<React.SetStateAction<T>>];
interface Payload<T> {
	value: PayloadValue<T>;
}


interface ProviderProps<T> {
	value: Payload<T>;
}

interface ContextProviderProps<T> {
	initialValue: T;
	children: ReactNode;
	provider: React.ComponentType<ProviderProps<T>>;
}

interface GlobalStateProviderProps<T> {
	children: any;
	initialValue: T;
}

//#endregion

//#region Helpers

function ContextProvider<T>({ initialValue , children, provider: Provider }: ContextProviderProps<T>) {
	const [value, setValue] = useState(initialValue);
	const payload = useMemo(() => ({ value: [value, setValue] as PayloadValue<T> }), [value]);
	return <Provider value={payload}>{children}</Provider>;
}

function addGlobalsKey(current: SMap<GlobalState>, [key, value]: [string, any]) {
	return {
		...current,
		[key]: { context: createContext(value), value },
	};
}

//#endregion

export function GlobalStateProvider<T extends SMap<any>>({ initialValue, children }: GlobalStateProviderProps<T>) {
	if (!globals) {
		globals = Object.entries(initialValue).reduce(addGlobalsKey, {});
	}

	return Object.entries(globals).reduce(
		(
			newChildren,
			[
				key,
				{
					context: { Provider },
					value,
				},
			]
		) => (
			<ContextProvider key={key} provider={Provider} initialValue={value}>
				{newChildren}
			</ContextProvider>
		),
		children
	);
}

export function useGlobalState<T>(key: string): PayloadValue<T> {
	const payload = useContext<Payload<T>>(globals[key].context);

	if (!payload) {
		throw new Error('useGlobalState must be a descendant of the GlobalStateProvider component');
	}

	return payload.value;
}

export function useGlobalReducer<T>(key: string, reducer: (state: T, action: Action<T>) => T): [T, any] {
	const [state, setState] = useGlobalState<T>(key);

	const dispatch = useCallback(
		(action) => {
			setState(currentState => reducer(currentState, action));
			return action;
		},
		[reducer]
	);

	return [state, dispatch];
}
