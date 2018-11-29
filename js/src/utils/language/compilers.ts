import { toInt } from '../generalUtils';
import { AsmCompiler } from './asmCompiler';
import { opcodes } from './dsla';

export function dsl2machine(text: string): number[] {
	return text.split('\n').map(toInt).map(n => isNaN(n) ? 0 : n);
}

export function asm2dsl(text: string): string {

	const compiler = new AsmCompiler(opcodes);

	return compiler.emit(text.split(/\n/g));
}

export function js2asm(text: string): string {
	return '';
}