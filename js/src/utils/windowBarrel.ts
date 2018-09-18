
export function InitializeWindowBarrel(name: string, barrel: any) {
    let win = window as any;
    if (!win.DSLWASM) {
        win.DSLWASM = {};
    }

    win.DSLWASM[name] = barrel;
}