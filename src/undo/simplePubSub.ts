type Callback<T> = (newVal: T) => void;
type UnsbscribeFunction = () => void;

export function createStore<T>(initial: T, isEqual: (a: T, b: T) => boolean = (a, b) => a === b) {
  let _value: T = initial;
  const subs = new Set<Callback<T>>();
  return {
    get() {
      return _value;
    },
    set(newVal: T) {
      if (isEqual(_value, newVal)) return;
      _value = newVal;
      subs.forEach((callbackfn) => callbackfn(_value));
    },
    subscribe(callbackfn: Callback<T>): UnsbscribeFunction {
      subs.add(callbackfn);
      callbackfn(_value);

      return () => {
        subs.delete(callbackfn);
      };
    },
  };
}
