import _ from 'lodash';
import { transformer, argsAndReturnToFunctions, OpcodeInformation } from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';
import { SMap } from '../utilTypes';

type i = number;

/**
 * The machine code opcodes
 */
export const _DslOpcodes = {
	Noop: () => [0],

	LoadValueAtAddressIntoBus: (i: i) => [1, i],

	SaveValueInBusToLocation: (i: i) => [2, i],

	LoadWithConstantOffsetFromHereToBus: (i: i) => [3, i],

	SaveFromBusWithConstantOffsetFromHere: (i: i) => [4, i],

	LoadWithConstantOffsetToBus: (variable: i, offset: i) => [5, variable, offset],

	SaveFromBusWithConstantOffset: (variable: i, offset: i) => [6, variable, offset],

	LoadWithBusAsConstantOffsetFromHere: () => [7],

	SaveWithBusAsConstantOffsetFromHere: () => [8],

	AluDoAdd: () => [9],

	// 10

	AluMultiply: () => [11],

	AluDivide: () => [12],

	JumpWithBusValueRelative: () => [13],

	BranchTo: (offset: i) => [14, offset],

	LinkIfBranched: () => [15],

	AluHiToBus: () => [16],

	AluLoToBus: () => [17],

	AluToInt: () => [18],

	AluToFloat: () => [19],

	NewBlock: () => [20],

	Syscall: (i: i) => [21, i],

	// 22

	Pause: () => [23],

	LoadImmmediateToBus: (i: i) => [24, i],

	AluPushFromBus: () => [25],

	LoadWithVariableOffsetToBus: (variable: i, offsetVar: i) => [26, variable, offsetVar],

	SaveFromBusWithVariableOffset: (variable: i, offsetVar: i) => [27, variable, offsetVar],

	GetCurrentPosition: () => [28],

	AluDoComparisonWithMode: (mode: i) => [29, mode],

	Halt: () => [100],
};

// export const DslOpcodeComments: {[p in keyof typeof _DslOpcodes]: string} = {
// 	Noop: '',
// 	LoadValueAtAddressIntoBus: '',
// 	SaveValueInBusToLocation: '',
// 	LoadWithConstantOffsetToBus: '',
// 	SaveFromBusWithConstantOffset: '',
// 	LoadWithVariableOffsetToBus: '',
// 	SaveFromBusWithVariableOffset: '',
// 	AluDoAdd: '',
// 	AluDoComparisonWithMode: '',
// 	AluHiToBus: '',
// 	AluLoToBus: '',
// 	LoadImmmediateToBus: '',
// 	AluPushFromBus: '',
// 	BranchTo: '',
// 	JumpWithBusValueRelative: '',
// 	GetCurrentPosition: '',
// 	Halt: '',
// 	AluDivide: '',
// 	AluMultiply: '',
// 	AluNegate: '',
// 	AluToFloat: '',
// 	AluToInt: '',
// 	LoadWithBusAsConstantOffsetFromHere: '',
// 	LoadWithConstantOffsetFromHereToBus: '',
// 	NewBlock: '',
// 	Pause: ''
// };

export const DslOpcodeParamCounts: SMap<number> =
	_.mapValues(_DslOpcodes, fn => fn.length);

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