

const argNameRegex = /\(((\w+[,\s]*)*)\)/;
export function getFunctionArgs(f: Function): string[] {
	return (argNameRegex.exec(f.toString()) || [])[1].replace(/\s/g, '').split(',');
}