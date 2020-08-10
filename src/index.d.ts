export default function <TFactory>(
  store: TFactory
): StoreFactoryInfer<TFactory>;
export default function <TFactory, TResult>(
  store: TFactory,
  selector: (
    store: StoreFactoryInfer<TFactory>,
    context?: SelectorContext
  ) => TResult
): TResult;

type StoreFactoryInfer<TFactory> = TFactory extends (
  context: StoreContext
) => infer TStoreMetadata
  ? StoreInfer<TStoreMetadata>
  : never;

type StoreInfer<TFactory> = TFactory extends {
  state(): infer TState;
}
  ? Omit<
      Store<TFactory> & StorePropsInfer<TFactory> & StoreMethodsInfer<TFactory>,
      "init"
    >
  : never;

interface StoreState<TState> {
  state: TState;
}

interface SelectorContext {
  asyncValue<T>(loadable: Loadable<T>): T;
}

export interface Store<TState> extends StoreState<TState> {
  subscribe(observer: (store?: Store<TState>) => any): Unsubscribe;
}

type StorePropsInfer<T> = T extends {
  state(): infer TState;
}
  ? { state: TState }
  : never;

type StoreMethodsInfer<TStoreMetadata> = {
  [key in keyof TStoreMetadata]: TStoreMetadata[key];
};

type Unsubscribe = () => void;

export interface StoreContext {
  loader(): Loader;
  all(...targets: (string | Promise<any>)[]): Promise<any[]>;
  any(...targets: (string | Promise<any>)[]): [any, any];
  chain(...targets: (string | Promise<any>)[]): Promise<any[]>;
  on(event: "*" | string, listener: Listener): Unsubscribe;
  use<T>(store: T): StoreFactoryInfer<T>;
  use<T1, T2>(stores: [T1, T2]): [StoreFactoryInfer<T1>, StoreFactoryInfer<T2>];
  use<T1, T2, T3>(
    stores: [T1, T2, T3]
  ): [StoreFactoryInfer<T1>, StoreFactoryInfer<T2>, StoreFactoryInfer<T3>];
  use<T1, T2, T3, T4>(
    stores: [T1, T2, T3, T4]
  ): [
    StoreFactoryInfer<T1>,
    StoreFactoryInfer<T2>,
    StoreFactoryInfer<T3>,
    StoreFactoryInfer<T4>
  ];
  use<T1, T2, T3, T4, T5>(
    stores: [T1, T2, T3, T4, T5]
  ): [
    StoreFactoryInfer<T1>,
    StoreFactoryInfer<T2>,
    StoreFactoryInfer<T3>,
    StoreFactoryInfer<T4>,
    StoreFactoryInfer<T5>
  ];
  use(stores: Function[]): Store<any>[];
}

interface Loader {
  load(...targets: (Loadable<any> | Loader | Promise<any>)[]): Loader;
  loadable: Loadable<any>;
  detach(): Loader;
  cancel(): Loader;
}

interface Loadable<T> {
  state: "loading" | "hasValue" | "hasError";
  value: T;
  /**
   * try get sync value
   * 1. A promise object will be thrown if loadable is still loading (state = loading)
   * 2. An error will be thrown if loadable has an error (state = hasError)
   */
  $value: T;
  error: any;
}

type Listener = (args: { action: string; payload: any }) => any;
