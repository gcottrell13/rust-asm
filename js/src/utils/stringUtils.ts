
export function stringHasContent(str: string | undefined | null): str is string {
	return !isNullOrWhitespace(str);
}
export function isNullOrWhitespace(str: string | undefined | null): boolean {
	return !str || str.match(/^\s*$/g) !== null;
}