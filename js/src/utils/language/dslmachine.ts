import { SMap } from '../utilTypes';
import * as _ from 'lodash';
import { transformer, changeParamTypes } from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';

export type i = number;

/**
 * The machine code opcodes
 */
const _DslOpcodes = {
	Noop: () => [0],
	LoadValueAtAddressIntoBus: (i: i) => [1, i],
	SaveValueInBusToLocation: (i: i) => [2, i],
	LoadMemBusToBus: () => [5],
	SaveBusToMemBus: () => [6],
	AluDoAdd: () => [9],
	AluHiToBus: () => [16],
	AluLoToBus: () => [17],
	LoadImmmediateToBus: (i: i) => [24, i],
	AluPushFromBus: () => [25],
};

};

const _transformedDslOpcodes = _.mapValues(_DslOpcodes, transformer);

export const DslOpcodes: {
	[p in keyof typeof _DslOpcodes]: changeParamTypes<typeof _DslOpcodes[p]>;
} = _transformedDslOpcodes as any;

InitializeWindowBarrel('DSLMachine', {
	DslOpcodes,
});