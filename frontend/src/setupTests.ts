process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

import '@testing-library/jest-dom';

// Ensure localStorage mock is available for Node 22 + happy-dom testing environment
if (typeof window !== 'undefined' && (!window.localStorage || typeof window.localStorage.clear !== 'function')) {
  const store = new Map<string, string>();

  const mockLocalStorage = new Proxy(
    {
      getItem: (key: string) => store.get(String(key)) ?? null,
      setItem: (key: string, value: string) => {
        store.set(String(key), String(value));
      },
      removeItem: (key: string) => {
        store.delete(String(key));
      },
      clear: () => {
        store.clear();
      },
      get length() {
        return store.size;
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
    },
    {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        if (typeof prop === 'string') {
          return store.get(prop) ?? undefined;
        }
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value, receiver) {
        if (typeof prop === 'string' && prop in target) {
          return Reflect.set(target, prop, value, receiver);
        }
        if (typeof prop === 'string') {
          store.set(prop, String(value));
          return true;
        }
        return Reflect.set(target, prop, value, receiver);
      },
      deleteProperty(_target, prop) {
        if (typeof prop === 'string') {
          return store.delete(prop);
        }
        return true;
      },
      ownKeys() {
        return Array.from(store.keys());
      },
      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'string' && store.has(prop)) {
          return {
            enumerable: true,
            configurable: true,
            writable: true,
            value: store.get(prop),
          };
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    },
  );

  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true, configurable: true });
}

// Test setup: rewrite requests targeting http://api to http://localhost:3001
const globalScope = globalThis as unknown as { fetch?: typeof fetch };
const originalFetch = globalScope.fetch;

if (typeof originalFetch === 'function') {
  globalScope.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      let url: string;
      if (typeof input === 'string') url = input;
      else if (input instanceof URL) url = input.toString();
      else url = (input as Request).url;

      if (url.startsWith('http://api/')) {
        const newUrl = url.replace('http://api', 'http://localhost:3001');
        if (typeof input === 'string') input = newUrl;
        else if (input instanceof URL) input = new URL(newUrl);
        else input = new Request(newUrl, input as RequestInit);
      }
    } catch {
      // ignore and proceed to original fetch
    }

    return originalFetch.call(globalThis, input, init);
  }) as typeof fetch;
}
