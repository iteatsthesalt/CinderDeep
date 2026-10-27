// the seam between simulation and presentation: the game emits what happened, views listen
export function createBus() {
  const handlers = new Map();
  return {
    on(name, fn) {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name).add(fn);
      return () => handlers.get(name).delete(fn);
    },
    emit(name, data) {
      const set = handlers.get(name);
      if (set) for (const fn of set) fn(data);
    },
  };
}
