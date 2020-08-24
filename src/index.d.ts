declare const storeact: StoreactExports;

export default storeact;

export interface StoreactExports extends Function {
  <T>(definition: T): StoreInfer<T>;
  <T, TResult>(
    definition: T,
    selector: (store?: StoreInfer<T>, util?: SelectorUtil) => TResult
  ): TResult;

  module(name: string, factory: Function): RemoveModule;
}

export interface StoreContext {
  task: TaskModule;
  atom: AtomModule;
  cache: CacheModule;
}

export interface Store<T> {
  readonly state: T;
  /**
   * indicate that store initialization is completed or not
   */
  readonly loading: boolean;
  /**
   * indicate that store's actions are dispatching
   */
  readonly busy: boolean;
  // /**
  //  * get last error
  //  */
  // readonly error: any;
  subscribe(subscription: DispatchSubscription): Unsubscribe;
}

export interface SelectorUtil {
  value<T>(value: Promise<T> | T, defaultValue: T): T;
  loadable<T>(value: Promise<T> | T): Loadable<T>;
}

export interface Loadable<T> {
  readonly value: T;
  readonly error: any;
  readonly state: LoadableState;
}

export interface Task {
  on(actions: string, listener: DispatchListener): Unsubscribe;
  once(actions: string, listener: DispatchListener): Unsubscribe;
  delay(ms?: number): Promise<void>;
  debounce(ms?: number, ...cancelOn: Awaitable[]): Promise<void | never>;
  when<T>(awaitable: Promise<T>, options?: WhenOptions<T>): Promise<T>;
  when<T>(
    awaitable: string | ((payload: T, ...args: any[]) => any),
    options?: WhenOptions<any>
  ): Promise<T>;
  when(awaitables: Awaitable[], options?: WhenOptions<any>): Promise<any[]>;
  when<T extends { [key: string]: Awaitable }>(
    awaitables: T,
    options?: WhenOptions<any>
  ): Promise<
    { [key in keyof T]: { payload: PayloadInfer<T[key]>; type: T[key] } }
  >;
  cancelOn(...awaitables: Awaitable[]): void;
  latest(): void;
  mutate<T>(fn: () => T): T;
  mutate<T>(atom: Atom<T>, value: T | ((prev: T) => T)): Promise<T>;
  mutate<T, U>(
    atom: Atom<T>,
    value: Promise<U> | ((prev: T) => Promise<U>),
    normalizer: (result: U, value: T) => T
  ): Promise<T>;

  call(fn: Function): Task;
  cancel(): void;
  cancelled(): boolean;
  lock<T>(fn: () => T): T;
}

export interface WhenOptions<T> {
  onSuccess?(listener: GenericListener<T>): any;
  onError?(listener: GenericListener<any>): any;
  onDone?(listener: GenericListener<void>): any;
}

export interface Atom<T> {
  value: T;
  readonly state: LoadableState;
  readonly error: any;
  readonly ready: Promise<T>;
  readonly hasError: boolean;
  readonly hasValue: boolean;
  readonly loading: boolean;
  onReady(listener: GenericListener<Atom<T>>): Unsubscribe;
  onChange(listener: GenericListener<Atom<T>>): Unsubscribe;
  cancel(): void;
  reset(): void;
  map<U>(mapper: (value: T) => U): Atom<U>;
}

export interface CacheModule extends Function {
  <T extends (...args: any[]) => any>(memberFactory: T): T &
    CacheFamily & { delete(...args: Parameters<T>): void };
}

export interface TaskModule
  extends Function,
    Pick<Task, "on" | "once" | "delay" | "debounce" | "when"> {
  (options?: TaskOptions): Task;
}

export interface AtomModule extends Function {
  <T>(defaultValue?: T): Atom<T>;
}

export interface CacheFamily {
  clear(): void;
}

export interface TaskOptions {
  onCancel?(listener: GenericListener<Task>): any;
  cancelOn?: Awaitable | Awaitable[];
}

type LoadableState = "loading" | "hasValue" | "hasError";

type Awaitable = string | Function | Promise<any>;

type PayloadInfer<T> = T extends Promise<infer TResolved> ? TResolved : any;

type StoreInfer<T> = T extends (context?: StoreContext) => infer TProps
  ? Store<StoreStateInfer<TProps>> &
      Omit<StoreMethodsInfer<TProps>, "state" | "init">
  : never;

type StoreStateInfer<T> = T extends { state(): infer TState }
  ? TState
  : T extends { state: infer TState }
  ? TState
  : any;

type StoreMethodsInfer<T> = {
  [key in keyof T]: StoreMethodInfer<T[key]> & { readonly running: boolean };
};

type StoreMethodInfer<T> = T extends (
  payload: infer TPayload,
  task?: any
) => infer TResult
  ? (payload?: TPayload) => TResult
  : T;

type Unsubscribe = () => void;

type DispatchSubscription = GenericListener<{
  store: Store<any>;
  action: string;
  payload: any;
}>;

type DispatchListener = GenericListener<{ action: string; payload: any }>;

type GenericListener<T> = (args: T) => any;

type RemoveModule = () => void;
