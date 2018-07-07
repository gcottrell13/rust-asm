import { toInt } from "../generalUtils";

export function dsl2machine(text: string): number[] {
    return text.split('\n').map(toInt).map(n => isNaN(n) ? 0 : n);
}

export function asm2dsl(text: string): string {
    return '';
}

export function lewd2asm(text: string): string {
    return '';
}

export function js2asm(text: string): string {
    return '';
}