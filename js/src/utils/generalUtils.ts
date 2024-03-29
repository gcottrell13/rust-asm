
export function Sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export async function mapAsync<T, U>(items: T[], fn: (t: T) => Promise<U>) {
	const newlist: U[] = [];
	for (let i = 0; i < items.length; i++) {
		newlist.push(await fn(items[i]));
	}
	return newlist;
}

export function TextFromBlobAsync(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		var reader = new FileReader();
		reader.onload = function () {
			resolve(reader.result as string);
		};
		reader.readAsText(blob);
	});
}

export function StringToASCII(text: string): Uint8Array {
	return (new TextEncoder()).encode(text);
}

export function toInt(n: string): number {
	const i = parseInt(n, 10);
	if (isNaN(i)) {
		throw new Error(`Cannot parse '${n}' to an integer`);
	}
	return i;
}

export function toIntOrNull(n: string): number | null {
	try {
		return toInt(n);
	}
	catch {
		return null;
	}
}

export function group<T>(n: number, arr: ArrayLike<T>): T[][] {
	let groups: T[][] = [];
	let lastGroup: T[] = [];
	for (let i = 0; i < arr.length; i++) {
		if (lastGroup.length === 0) {
			groups.push(lastGroup);
		}

		lastGroup.push(arr[i]);

		if (lastGroup.length >= n) {
			lastGroup = [];
		}
	}
	if (lastGroup.length > 0) {
		groups.push(lastGroup);
	}
	return groups;
}