
export function isNotNullOrWhitespace(str: string) {
	if (str === null) return false;
	return !str.match(/^\s*$/g);
}