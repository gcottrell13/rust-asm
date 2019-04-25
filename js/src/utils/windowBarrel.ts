
export function InitializeWindowBarrel(name: string, barrel: any) {
	let win = (typeof window !== 'undefined' ? window : undefined) as any;
	if (win) {
		if (!win.DSLWASM) {
			win.DSLWASM = {};
		}
	
		win.DSLWASM[name] = barrel;
	}
}