import _ from 'lodash';
import { transformer, argsAndReturnToFunctions, OpcodeInformation } from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';
import { SMap } from '../utilTypes';

export type i = number;

/**
 * The machine code opcodes
 */
export const _DslOpcodes = {
	Noop: () => [0],
	LoadValueAtAddressIntoBus: (i: i) => [1, i],
	SaveValueInBusToLocation: (i: i) => [2, i],
	LoadWithConstantOffsetToBus: (variable: i, offset: i) => [5, variable, offset],
	SaveFromBusWithConstantOffset: (variable: i, offset: i) => [6, variable, offset],
	LoadWithVariableOffsetToBus: (variable: i, offsetVar: i) => [26, variable, offsetVar],
	SaveFromBusWithVariableOffset: (variable: i, offsetVar: i) => [27, variable, offsetVar],
	AluDoAdd: () => [9],
	AluDoComparisonWithMode: (mode: i) => [29, mode],
	AluHiToBus: () => [16],
	AluLoToBus: () => [17],
	LoadImmmediateToBus: (i: i) => [24, i],
	AluPushFromBus: () => [25],

	GetCurrentPosition: () => [28],

	JumpWithBusValueRelative: () => [13],
	BranchTo: (offset: i) => [14, offset],

	Halt: () => [100],
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
	AluDoComparisonWithMode: '',
	AluHiToBus: '',
	AluLoToBus: '',
	LoadImmmediateToBus: '',
	AluPushFromBus: '',
	BranchTo: '',
	JumpWithBusValueRelative: '',
	GetCurrentPosition: '',
	Halt: '',
};

export const DslOpcodeParamCounts: {[p in keyof typeof _DslOpcodes]: number} = {
	GetCurrentPosition: 0,
	AluDoComparisonWithMode: 1,
	JumpWithBusValueRelative: 0,
	AluDoAdd: 0,
	AluHiToBus: 0,
	AluLoToBus: 0,
	AluPushFromBus: 0,
	BranchTo: 1,
	LoadImmmediateToBus: 1,
	LoadValueAtAddressIntoBus: 1,
	LoadWithConstantOffsetToBus: 2,
	LoadWithVariableOffsetToBus: 2,
	Noop: 0,
	SaveFromBusWithConstantOffset: 2,
	SaveFromBusWithVariableOffset: 2,
	SaveValueInBusToLocation: 1,
	Halt: 0,
};

export const DslCodeToComment: SMap<string> = {};
_.forOwn(_DslOpcodes, (op, key) => {
	const arr = op(0, 0);
	const code = arr[0];
	DslCodeToComment[code] = key;
});

const _transformedDslOpcodes = _.mapValues(_DslOpcodes, transformer);

export const DslOpcodes: {
	[p in keyof typeof _DslOpcodes]: OpcodeInformation<typeof _DslOpcodes[p]>;
} = _transformedDslOpcodes as any;

InitializeWindowBarrel('DSLMachine', {
	DslOpcodes,
});