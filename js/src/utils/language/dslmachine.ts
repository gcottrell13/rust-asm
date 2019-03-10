import _ from 'lodash';
import { transformer, changeParamTypes } from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';
import { SMap } from '../utilTypes';

export type i = number;

/**
 * The machine code opcodes
 */
const _DslOpcodes = {
	Noop: () => [0],
	LoadValueAtAddressIntoBus: (i: i) => [1, i],
	SaveValueInBusToLocation: (i: i) => [2, i],
	LoadWithConstantOffsetToBus: (variable: i, offset: i) => [5, variable, offset],
	SaveFromBusWithConstantOffset: (variable: i, offset: i) => [6, variable, offset],
	LoadWithVariableOffsetToBus: (variable: i, offsetVar: i) => [26, variable, offsetVar],
	SaveFromBusWithVariableOffset: (variable: i, offsetVar: i) => [27, variable, offsetVar],
	AluDoAdd: () => [9],
	AluHiToBus: () => [16],
	AluLoToBus: () => [17],
	LoadImmmediateToBus: (i: i) => [24, i],
	AluPushFromBus: () => [25],
};

export const DslOpcodeComments: {[p in keyof typeof _DslOpcodes]: string} = {
	Noop: '',
	LoadValueAtAddressIntoBus: '',
	SaveValueInBusToLocation: '',
	LoadWithConstantOffsetToBus: '',
	SaveFromBusWithConstantOffset: '',
	LoadWithVariableOffsetToBus: '',
	SaveFromBusWithVariableOffset: '',
	AluDoAdd: '',
	AluHiToBus: '',
	AluLoToBus: '',
	LoadImmmediateToBus: '',
	AluPushFromBus: '',
};

export const DslCodeToComment: SMap<string> = {};
_.forOwn(_DslOpcodes, (op, key) => {
	const arr = op(0, 0);
	const code = arr[0];
	DslCodeToComment[code] = key;
});

const _transformedDslOpcodes = _.mapValues(_DslOpcodes, transformer);

export const DslOpcodes: {
	[p in keyof typeof _DslOpcodes]: changeParamTypes<typeof _DslOpcodes[p]>;
} = _transformedDslOpcodes as any;

InitializeWindowBarrel('DSLMachine', {
	DslOpcodes,
});