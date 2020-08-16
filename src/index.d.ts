declare const storeact: DefaultExports;
export default storeact;

export interface Context {
  async: AsyncModuleExports;
  cache: CacheModuleExports;
  lock: LockExports;
  forceUpdate();
  forceUpdate(...functions: Function[]): void;
}

export interface Cancellable {
  readonly cancelled: boolean;
  cancel(): void;
  wrap<T extends (...args: any[]) => any>(obj: T): CancellableWrappedInfer<T>;
  wrap<T extends Promise<any>>(
    obj: T,
    onResolve: Function
  ): CancellableWrappedInfer<T>;
  wrap<T extends Promise<any>>(
    obj: T,
    options?: WrapOptions
  ): CancellableWrappedInfer<T>;
  call<T extends Function>(func: T, ...args: any[]): void;
}

export type Flow =
  | FlowProps
  | Omit<
      ChildFlows,
      "$id" | "$debounce" | "$state" | "$block" | "$fork" | "$cancel" | "$then"
    >;

interface DefaultExports {
  /**
   * Retrieve current store context
   */
  (): Context;
  /**
   * Retrieve store instance from sepcific definition.
   * This is React hook if you call it inside component rendering phase
   */
  <TDefinition extends (...args: any[]) => any>(
    definition: TDefinition
  ): StoreInfer<ReturnType<TDefinition>>;
  /**
   * Retrieve store's selected value.
   * This is react hook so it must be called inside component rendering phase
   */
  <TDefinition extends (...args: any[]) => any, TResult>(
    definition: TDefinition,
    selector: (store: StoreForSelectorInfer<ReturnType<TDefinition>>) => TResult
  ): TResult;
}

interface Store<TState = any> {
  state: TState;
  onChange(listener: GenericListener<this>): RemoveListener;
  onDispatch(
    action: ActionName | Action,
    listener: DispatchListener
  ): RemoveListener;
  onDispatch(listener: DispatchListener): RemoveListener;
}

interface StoreForSelector<T> extends Store<T> {
  valueOf<T>(value: PromiseValue<T> | AsyncValue<T>): T;
  valueOf<T>(value: PromiseValue<T> | AsyncValue<T>, defaultValue: T): T;
  loadableOf<T>(value: PromiseValue<T> | AsyncValue<T>): Loadable<T>;
}

interface Loadable<T> {
  readonly state: "loading" | "hasValue" | "hasError";
  readonly value: T;
  readonly error: any;
}

interface CacheModuleExports {
  family(): FamilyInfer<() => { [key: string]: any }>;
  family<Factory>(member: Factory): FamilyInfer<Factory>;
}

interface AsyncModuleExports {
  race<TAwaitableMap extends { [key: string]: Awaitable | AwaitableList }>(
    awaitable: TAwaitableMap
  ): Task<
    {
      [key in keyof TAwaitableMap]: {
        type: TAwaitableMap[key];
        payload: TaskResultInfer<TAwaitableMap[key]>;
      };
    }
  >;
  race(awaitable: Awaitable): Task<TaskResultInfer<Awaitable>>;
  race(...awaitables: Awaitable[]): Task<any>;
  delay<T = undefined>(ms?: number, value?: T): Promise<T>;
  debounce(
    ms: number,
    ...cancelActions: Awaitable[]
  ): CancellablePromise<boolean>;
  cancellable(...cancelActions: Awaitable[]): Cancellable;
  forever<T = any>(): Promise<T>;
  value<T = any>(value?: T): AsyncValue<T>;
}

interface AsyncValue<T> {
  value: T;
  readonly loading: boolean;
  readonly dirty: boolean;
  readonly promise: Promise<T>;
  readonly error: any;
  cancel(): void;
  update(reducer: (prev: T) => T): AsyncValue<T>;
  load(
    value: Promise<T> | false | null | undefined,
    cancellable?: Cancellable
  ): AsyncValue<T>;
  reset(): AsyncValue<T>;
  onChange(listener: GenericListener<AsyncValue<T>>): RemoveListener;
  onReady(listener: GenericListener<AsyncValue<T>>): RemoveListener;

  /**
   * Enable auto update mode. In this mode, the store will update whenever AsyncValue updated
   */
  autoUpdate(): AsyncValue<T>;
}
/**
 * lock one or multiple actions and auto unlock until specified events triggered (action dispatched, promise resolved, AsyncValue is ready)
 */
interface LockExports extends Function {
  (action: Action | Function, ...unlockEvents: Awaitable[]): Unlock;
  (actions: (Action | Function)[], ...unlockEvents: Awaitable[]): Unlock;
}

interface Task<TResult = any> extends Promise<TResult> {
  readonly done: boolean;
  readonly success: boolean;
  readonly fail: boolean;
  readonly result: TResult;
  readonly error: any;
  run(func: (task?: Task<TResult>) => any): void;
}

interface CancellablePromise<T = any> extends Promise<T> {
  cancel(): void;
}

interface WrapOptions {
  onResolve?: Function;
  onReject?: Function;
  onDone?: Function;
  onCancel?: Function;
}

interface ChildFlows {
  [key: string]: Flow;
}

interface FlowProps {
  $id?: string;
  $debounce?: number;
  $state?: (() => any) | any;
  $block?: boolean;
  $fork?: boolean;
  $cancel?: string | string[];
  $then: FlowId | ((...args: any[]) => FlowId | Flow) | Flow;
  $options?: FlowOptions;
}

interface FlowOptions {
  onDispatch?: (flow?: FlowArgs) => any;
}

interface FlowArgs {
  id: string;
  name: string;
}

type FlowId = RootFlowId | string;
type RootFlowId = "#";

type FamilyInfer<TFactory> = TFactory extends (...args: any) => any
  ? TFactory & {
      clear(): void;
      delete(...args: Parameters<TFactory>): void;
    }
  : never;

type CancellableWrappable = Function | Promise<any>;

type CancellableWrappedInfer<T> = T extends Promise<infer TResolved>
  ? CancellablePromise<TResolved>
  : T extends Function
  ? T
  : T extends { [key in keyof T]: CancellableWrappable }
  ? { [key in keyof T]: CancellableWrappedInfer<T[key]> }
  : T extends CancellableWrappable[]
  ? CancellableWrappedInfer<T[number]>[]
  : never;

type StoreInfer<TDefinition> = StoreActionListInfer<TDefinition> &
  Store<StoreStateInfer<TDefinition>>;

type StoreForSelectorInfer<TDefinition> = StoreActionListInfer<TDefinition> &
  StoreForSelector<StoreStateInfer<TDefinition>>;

type StoreActionListInfer<TDefinition> = Omit<
  {
    [key in keyof TDefinition]: StoreActionInfer<TDefinition[key]>;
  },
  "init" | "flow"
>;

type StoreStateInfer<TDefinition> = TDefinition extends {
  state(): infer TState;
}
  ? TState
  : any;

type StoreActionInfer<TAction> = TAction extends (...args: any[]) => any
  ? TAction
  : never;
type ActionName = string;
type PromiseValue<T = any> = Promise<T>;
type Action<T = any> = (payload?: T, ...args: any[]) => any;
type Awaitable = ActionName | PromiseValue | Action | AsyncValue<any>;
type AwaitableList = Awaitable[];
type TaskResultInfer<TAwaitable> = TAwaitable extends PromiseValue<
  infer TResolved
>
  ? TResolved
  : TAwaitable extends Action<infer TPayload>
  ? TPayload
  : any;
type RemoveListener = () => void;
type DispatchListener = GenericListener<{ action: Function; payload: any }>;
type GenericListener<T> = (args?: T) => any;
type Unlock = () => void;
