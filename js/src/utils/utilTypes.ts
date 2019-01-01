export interface SMap<T> {
	[p: string]: T;
}

export type Dict<K extends string | number | symbol, V> = { [p in K]: V; };

export type keyable = string | number | symbol;

interface MapFunction<TIn, TOut> {
	(v: TIn): TOut;
}

interface FilterFunction<TIn> {
	(v: TIn): boolean;
}

interface Matching<T> {
	Just?: (value: T) => void;
	None?: () => void;
}

type Optional<T> = T | null | undefined;

export interface Maybe<T> {
    /**
     * Gives either the value if Just<T> or null if None.
     */
	value(): T | null;

    /**
     * UNSAFE Gives the value. Use only if you know for sure that the value will exist.
     */
	unwrap(): T;

    /**
     * Returns whether or not there is a value.
     */
	hasValue(): boolean;

    /**
     * Applies the given function to the value, if it exists.
     * @param fn the mapping function
     */
	map<R>(fn: MapFunction<T, Optional<R>>): Maybe<R>;

    /**
     * Provides a default value if none
     * @param fn 
     */
	else(fn: () => T): Maybe<T>;

    /**
     * Gets the given property, if it exists.
     * @param propName the property to get
     */
	prop<O extends keyof T>(propName: O): Maybe<T[O]>;

    /**
     * Calls the appropriate function given the state of the Maybe
     * @param m 
     */
	match(m: Matching<T>): Maybe<T>;

    /**
     * Returns a value if it matches.
     * @param fn fn
     */
	filter(fn: FilterFunction<T>): Maybe<T>;
}

export class None<T> implements Maybe<T> {
	value() {
		return null;
	}

	unwrap() {
		return null as any as T;
	}

	hasValue() {
		return false;
	}

	map<R>(mapFn: MapFunction<T, Optional<R>>) {
		return new None<R>();
	}

	match(m: Matching<T>): Maybe<T> {
		if (m.None) {
			m.None();
		}
		return this;
	}

	else(fn: () => T): Maybe<T> {
		return Maybe(fn());
	}

	prop<O extends keyof T>(propName: O): Maybe<T[O]> {
		return new None<T[O]>();
	}

	filter(fn: FilterFunction<T>): Maybe<T> {
		return this;
	}

	static of<TIn>(): Maybe<TIn> {
		return new None<TIn>();
	}
}

export class Just<T> implements Maybe<T> {
	$value: T;
	constructor(v: T) {
		this.$value = v;
	}

	value() {
		return this.$value;
	}

	unwrap() {
		return this.$value;
	}

	hasValue() {
		return true;
	}

	map<R>(mapFn: MapFunction<T, Optional<R>>): Maybe<R> {
		let newValue = mapFn(this.$value);
		if (newValue === null || newValue === undefined) {
			return new None<R>();
		}
		return new Just<R>(newValue);
	}

	match(m: Matching<T>): Maybe<T> {
		if (m.Just) {
			m.Just(this.$value);
		}

		return this;
	}

	else(fn: () => T): Maybe<T> {
		return this;
	}

	prop<O extends keyof T>(propName: O): Maybe<T[O]> {
		return new Just(this.$value[propName]);
	}

	filter(fn: FilterFunction<T>): Maybe<T> {
		return fn(this.$value) ? this : new None<T>();
	}

	static of<TIn>(obj: TIn): Maybe<TIn> {
		return new Just(obj);
	}
}

export function Maybe<T>(value: Optional<T>): Maybe<T> {
	if (value === null || value === undefined) {
		return new None<T>();
	}
	return new Just(value);
}

export function prop<T, O extends keyof T>(obj: T, propName: O): Maybe<T[O]> {
	let v = obj[propName];
	if (v !== undefined) {
		return new Just(v);
	}
	return new None<T[O]>();
}

export function compose<X, Y, Z>(fn1: (x: X) => Y, fn2: (y: Y) => Z): ((x: X) => Z) {
	return (x: X) => fn2(fn1(x));
}

/**
 * Used to un-nest nested Maybe's.
 * Takes in the inner maybe.
 * @example 
 * let m: Maybe<Maybe<number>>;
 * let innerMaybe: Maybe<number> = m.map(collapse);
 * @param m maybe
 */
export function collapse<T>(m: Maybe<T>): Optional<T> {
	if (m.hasValue()) {
		return m.unwrap();
	}
	return null;
}


export class Either<T> {
	private $value: T | undefined;
	private $messasge: string | undefined;

	constructor(value?: T, errorMessage?: string) {
		this.$value = value;
		this.$messasge = errorMessage;
	}

	public HasValue(): boolean {
		return this.$value !== undefined;
	}

	public static of<T>(value: T) {
		return new Either<T>(value);
	}

	public static error(msg: string) {
		return new Either<any>(undefined, msg);
	}
}