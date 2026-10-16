import { describe, it, expect } from 'bun:test';
import {
  KasStore,
  STORAGE_KEY,
  exportCsv,
  exportJson,
  importJson,
  loadState,
  saveState,
  type StorageAdapter,
} from '../src/lib/persistence.ts';
import { initialState, kasReducer, type KasState } from '../src/lib/kas.ts';

class MockStorage implements StorageAdapter {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function stateWithMember(): KasState {
  let s = initialState();
  s = kasReducer(s, { type: 'ADD_MEMBER', name: 'Budi' });
  s = kasReducer(s, { type: 'ADD_CASH_IN', memberId: s.members[0].id, period: '2026-10', amount: 20000 });
  s = kasReducer(s, { type: 'ADD_CASH_OUT', note: 'Listrik', amount: 5000 });
  return s;
}

describe('loadState / saveState', () => {
  it('returns initial state for empty storage', () => {
    const storage = new MockStorage();
    expect(loadState(storage)).toEqual(initialState());
  });

  it('roundtrips state through storage', () => {
    const storage = new MockStorage();
    const state = stateWithMember();
    saveState(storage, state);
    expect(loadState(storage)).toEqual(state);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(state));
  });

  it('falls back to initial state on corrupt JSON', () => {
    const storage = new MockStorage();
    storage.setItem(STORAGE_KEY, 'not json');
    expect(loadState(storage)).toEqual(initialState());
  });

  it('falls back to initial state on wrong version', () => {
    const storage = new MockStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState(), version: 99 }));
    expect(loadState(storage)).toEqual(initialState());
  });
});

describe('exportJson', () => {
  it('includes version, exportedAt, and all collections', () => {
    const state = stateWithMember();
    const doc = JSON.parse(exportJson(state));
    expect(doc.version).toBe(1);
    expect(typeof doc.exportedAt).toBe('string');
    expect(doc.members).toHaveLength(1);
    expect(doc.cashIn).toHaveLength(1);
    expect(doc.cashOut).toHaveLength(1);
  });
});

describe('exportCsv', () => {
  it('produces CSV with headers and rows for all collections', () => {
    const state = stateWithMember();
    const csv = exportCsv(state);
    expect(csv.members.split('\n')[0]).toBe('id,name,active,createdAt,archivedAt');
    expect(csv.members.split('\n')).toHaveLength(2);
    expect(csv.cashin.split('\n')[0]).toBe('id,memberId,period,amount,note,createdAt');
    expect(csv.cashin.split('\n')).toHaveLength(2);
    expect(csv.cashout.split('\n')[0]).toBe('id,note,amount,createdAt');
    expect(csv.cashout.split('\n')).toHaveLength(2);
    expect(csv.cashin.split('\n')[1]).toContain('2026-10');
    expect(csv.cashin.split('\n')[1]).toContain('20000');
    expect(csv.cashout.split('\n')[1]).toContain('Listrik');
    expect(csv.cashout.split('\n')[1]).toContain('5000');
  });
});

describe('importJson', () => {
  it('imports a valid snapshot', () => {
    const state = stateWithMember();
    const imported = importJson(exportJson(state));
    expect(imported).toEqual(state);
  });

  it('rejects invalid JSON', () => {
    expect(() => importJson('not json')).toThrow('JSON tidak valid');
  });

  it('rejects unsupported version', () => {
    const bad = { ...stateWithMember(), version: 2 };
    expect(() => importJson(JSON.stringify(bad))).toThrow('Versi skema');
  });

  it('rejects missing collections', () => {
    const bad = { version: 1, members: [] };
    expect(() => importJson(JSON.stringify(bad))).toThrow('wajib diisi');
  });
});

describe('KasStore', () => {
  it('loads persisted state on construction', () => {
    const storage = new MockStorage();
    const state = stateWithMember();
    saveState(storage, state);
    const store = new KasStore(storage);
    expect(store.getState()).toEqual(state);
  });

  it('dispatches actions and persists', () => {
    const storage = new MockStorage();
    const store = new KasStore(storage);
    store.dispatch({ type: 'ADD_MEMBER', name: 'Amir' });
    expect(store.getState().members).toHaveLength(1);
    expect(loadState(storage).members).toHaveLength(1);
  });

  it('notifies subscribers on dispatch', () => {
    const storage = new MockStorage();
    const store = new KasStore(storage);
    const states: KasState[] = [];
    const unsub = store.subscribe((s) => states.push(s));
    store.dispatch({ type: 'ADD_MEMBER', name: 'Amir' });
    expect(states).toHaveLength(1);
    unsub();
    store.dispatch({ type: 'ADD_MEMBER', name: 'Budi' });
    expect(states).toHaveLength(1);
  });

  it('importJson replaces state and persists', () => {
    const storage = new MockStorage();
    const store = new KasStore(storage);
    store.dispatch({ type: 'ADD_MEMBER', name: 'Amir' });
    const other = stateWithMember();
    store.importJson(exportJson(other));
    expect(store.getState()).toEqual(other);
    expect(loadState(storage)).toEqual(other);
  });

  it('import of invalid snapshot leaves state untouched', () => {
    const storage = new MockStorage();
    const store = new KasStore(storage);
    store.dispatch({ type: 'ADD_MEMBER', name: 'Amir' });
    expect(() => store.importJson('not json')).toThrow();
    expect(store.getState().members).toHaveLength(1);
  });
});
