export function getPokeBackend(): PokeBackend {
  // The SSE impl has to keep process-wide state using the global object.
  // Otherwise the state is lost during hot reload in dev.
  const global = globalThis as unknown as {
    _pokeBackend: PokeBackend;
  };

  if (!global._pokeBackend) {
    global._pokeBackend = new PokeBackend();
  }

  return global._pokeBackend;
}

type Listener = () => void;
type ListenerMap = Map<string, Set<Listener>>;

export class PokeBackend {
  private _listeners: ListenerMap;

  constructor() {
    this._listeners = new Map();
  }

  addListeners(spaceID: string, listener: Listener) {
    let set = this._listeners.get(spaceID);

    if (!set) {
      set = new Set();
      this._listeners.set(spaceID, set);
    }

    set.add(listener);
    return () => {
      this._removeListener(spaceID, listener);
    };
  }

  poke(spaceID: string) {
    const set = this._listeners.get(spaceID);
    if (!set) return;

    for (const listener of Array.from(set)) {
      try {
        listener();
      } catch (error) {
        console.error(error);
      }
    }
  }

  private _removeListener(spaceID: string, listener: Listener) {
    const set = this._listeners.get(spaceID);
    if (!set) return;

    set.delete(listener);
    if (set.size === 0) {
      this._listeners.delete(spaceID);
    }
  }
}
