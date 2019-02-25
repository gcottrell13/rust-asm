
export function isNullOrWhitespace(str: string | undefined | null): boolean {
	return !str || str.match(/^\s*$/g) !== null;
}