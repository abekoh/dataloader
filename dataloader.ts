export type BatchLoadFn<K, V> = (keys: K[]) => Promise<(V | Error)[]>;

type Batch<K, V> = {
  hasDispatched: boolean;
  keys: K[];
  callbacks: {
    resolve: (value: V) => void;
    reject: (error: Error) => void;
  }[];
};

let resolvedPromise: Promise<void>;
const enqueuePostPromiseJob = function (fn: () => void) {
  if (!resolvedPromise) {
    resolvedPromise = Promise.resolve();
  }
  resolvedPromise.then(() => {
    process.nextTick(fn);
  })
}

export class DataLoader<K, V> {
  private batch: Batch<K, V> | null = null;
  private batchScheduleFn = enqueuePostPromiseJob;

  constructor(private batchLoadFn: BatchLoadFn<K, V>) {
  }

  load(key: K): Promise<V> {
    const batch = this.getCurrentBatch();
    batch.keys.push(key);
    const promise: Promise<V> = new Promise((resolve, reject) => {
      batch.callbacks.push({resolve, reject})
    });
    return promise;
  }

  private getCurrentBatch(): Batch<K, V> {
    const existingBatch = this.batch;
    if (existingBatch !== null && !existingBatch.hasDispatched) {
      return existingBatch;
    }
    const newBatch: Batch<K, V> = {
      hasDispatched: false,
      keys: [],
      callbacks: [],
    };
    this.batch = newBatch;
    this.batchScheduleFn(() => {
      this.dispatchBatch(newBatch);
    });
    return newBatch;
  }

  private dispatchBatch(batch: Batch<K, V>) {
    batch.hasDispatched = true;
    if (batch.keys.length === 0) {
      return;
    }
    const batchPromise = this.batchLoadFn(batch.keys);
    batchPromise.then((values: (V | Error)[]) => {
      if (values.length !== batch.keys.length) {
        throw new TypeError();
      }
      for (let i = 0; i < batch.callbacks.length; i++) {
        const value = values[i];
        if (value instanceof Error) {
          batch.callbacks[i].reject(value);
        } else {
          batch.callbacks[i].resolve(value);
        }
      }
    }).catch((error: Error) => {
      this.failedDispatch(batch, error);
    })
  }

  private failedDispatch(batch: Batch<K, V>, error: Error) {
    for (let i = 0; i < batch.keys.length; i++) {
      batch.callbacks[i].reject(error);
    }
  }

}
