
type Nullable<T> = T | null | undefined;

export function get<In, Out>(
	obj: Nullable<In>, 
	out: (i: In) => Out
): Out | null;
export function get<In, A, Out>(
	obj: Nullable<In>, 
	i: (i: In) => Nullable<A>, 
	out: (a: A) => Nullable<Out>
): Out | null;
export function get<In, A, B, Out>(
	obj: Nullable<In>, 
	i: (i: In) => Nullable<A>, 
	a: (a: A) => Nullable<B>, 
	out: (b: B) => Nullable<Out>
): Out | null;
export function get<In, A, B, C, Out>(
	obj: Nullable<In>, 
	i: (i: In) => Nullable<A>, 
	a: (a: A) => Nullable<B>, 
	b: (b: B) => Nullable<C>, 
	out: (c: C) => Nullable<Out>
): Out | null;
export function get<In, A, B, C, D, Out>(
	obj: Nullable<In>, 
	i: (i: In) => Nullable<A>, 
	a: (a: A) => Nullable<B>, 
	b: (b: B) => Nullable<C>, 
	c: (c: C) => Nullable<D>, 
	out: (d: D) => Nullable<Out>
): Out | null;
export function get<In, A, B, C, D, E, Out>(
	obj: Nullable<In>, 
	i: (i: In) => Nullable<A>, 
	a: (a: A) => Nullable<B>, 
	b: (b: B) => Nullable<C>, 
	c: (c: C) => Nullable<D>, 
	d: (d: D) => Nullable<E>, 
	out: (e: E) => Nullable<Out>
): Out | null;
export function get<In, A, B, C, D, E, F, Out>(
	obj: Nullable<In>, 
	i: (i: In) => Nullable<A>, 
	a: (a: A) => Nullable<B>, 
	b: (b: B) => Nullable<C>, 
	c: (c: C) => Nullable<D>, 
	d: (d: D) => Nullable<E>, 
	e: (e: E) => Nullable<F>, 
	out: (f: F) => Nullable<Out>
): Out | null;
export function get(input: any, ... rest: ((a: any) => any)[]) {
	let current = input;
	for (let i = 0; i < rest.length; i++) {
		if (current === null || current === undefined) {
			return null;
		}
		current = rest[i](current);
	}
	return current;
}

// interface AA {
// 	prop: number;
// 	inner?: AA;
// }
// interface BB {
// 	a: AA;
// 	b?: AA;
// 	c: AA | null;
// }
// const bb: BB = {
// 	a: {
// 		prop: 1,
// 	},
// 	c: null,
// };

// const numb = get(bb.b, aa => aa.inner, i => i.prop);