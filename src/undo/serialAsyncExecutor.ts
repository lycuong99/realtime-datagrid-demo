type ResRej = (value: unknown) => void;

type Queueable = {
  operation: () => any;
  resolvers: { resolve: ResRej; reject: ResRej };
};

export function serialAsyncExecutor() {
  const _queue: Queueable[] = [];
  let isWorking = false;
  async function pullFromQueue() {
    isWorking = true;
    while (true) {
      const currentOp = _queue.pop();
      if (!currentOp) {
        break;
      }

      const {
        operation,
        resolvers: { resolve, reject },
      } = currentOp;
      try {
        const res = await operation();
        resolve(res);
      } catch (error) {
        reject(error);
      }
    }
    isWorking = false;
  }

  return {
    execute(operation: () => any) {
      //   let resolve: ResRej, reject: ResRej;

      return new Promise((resolve, reject) => {
        _queue.push({
          operation,
          resolvers: { resolve, reject },
        });

        if (!isWorking) {
          pullFromQueue();
        }
      });
    },
  };
}
