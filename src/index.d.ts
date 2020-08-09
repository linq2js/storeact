export default function <TFactory>(
  store: TFactory
): StoreFactoryInfer<TFactory>;
export default function <TFactory, TResult>(
  store: TFactory,
  selector: (store: StoreFactoryInfer<TFactory>) => TResult
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
      "init" | "state"
    >
  : never;

type StorePropsInfer<T> = T extends {
  state(): infer TState;
}
  ? { [key in keyof TState]: TState[key] }
  : never;

type StoreMethodsInfer<TStoreMetadata> = {
  [key in keyof TStoreMetadata]: TStoreMetadata[key];
};

type Unsubscribe = () => void;

interface Store<T> {
  subscribe(observer: (store?: StoreInfer<T>) => any): Unsubscribe;
}

export interface StoreContext {
  all(...targets: (string | Promise<any>)[]): Promise<any[]>;
  any(...targets: (string | Promise<any>)[]): [any, any];
}
