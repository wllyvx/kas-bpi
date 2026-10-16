import {
  initialState,
  kasReducer,
  type CashIn,
  type CashOut,
  type KasAction,
  type KasState,
  type Member,
} from './kas.ts';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = 'kas:v1';

function isKasState(value: unknown): value is KasState {
  if (value === null || typeof value !== 'object') return false;
  const s = value as KasState;
  return (
    s.version === 1 &&
    Array.isArray(s.members) &&
    Array.isArray(s.cashIn) &&
    Array.isArray(s.cashOut)
  );
}

export function loadState(storage: StorageAdapter): KasState {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return initialState();
  try {
    const parsed = JSON.parse(raw);
    return isKasState(parsed) ? parsed : initialState();
  } catch {
    return initialState();
  }
}

export function saveState(storage: StorageAdapter, state: KasState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportJson(state: KasState): string {
  return JSON.stringify(
    {
      version: state.version,
      exportedAt: new Date().toISOString(),
      members: state.members,
      cashIn: state.cashIn,
      cashOut: state.cashOut,
    },
    null,
    2
  );
}

function csvValue(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvLine(values: unknown[]): string {
  return values.map(csvValue).join(',');
}

export function exportCsv(state: KasState) {
  const members = [
    csvLine(['id', 'name', 'active', 'createdAt', 'archivedAt']),
    ...state.members.map((m) => csvLine([m.id, m.name, m.active, m.createdAt, m.archivedAt ?? ''])),
  ].join('\n');
  const cashin = [
    csvLine(['id', 'memberId', 'period', 'amount', 'note', 'createdAt']),
    ...state.cashIn.map((c) => csvLine([c.id, c.memberId, c.period, c.amount, c.note ?? '', c.createdAt])),
  ].join('\n');
  const cashout = [
    csvLine(['id', 'note', 'amount', 'createdAt']),
    ...state.cashOut.map((c) => csvLine([c.id, c.note, c.amount, c.createdAt])),
  ].join('\n');
  return { members, cashin, cashout };
}

function requireField(doc: Record<string, unknown>, field: string): unknown {
  if (!(field in doc)) throw new Error(`Field ${field} wajib diisi`);
  return doc[field];
}

export function importJson(text: string): KasState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Format JSON tidak valid');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Format JSON tidak valid');
  }
  const doc = parsed as Record<string, unknown>;
  if (doc.version !== 1) throw new Error('Versi skema tidak didukung');
  const members = requireField(doc, 'members');
  const cashIn = requireField(doc, 'cashIn');
  const cashOut = requireField(doc, 'cashOut');
  if (!Array.isArray(members) || !Array.isArray(cashIn) || !Array.isArray(cashOut)) {
    throw new Error('Format JSON tidak valid');
  }
  return {
    version: 1,
    members: members as Member[],
    cashIn: cashIn as CashIn[],
    cashOut: cashOut as CashOut[],
  };
}

export class KasStore {
  private state: KasState;
  private storage: StorageAdapter;
  private listeners = new Set<(state: KasState) => void>();

  constructor(storage: StorageAdapter) {
    this.storage = storage;
    this.state = loadState(storage);
    saveState(storage, this.state);
  }

  getState(): KasState {
    return this.state;
  }

  dispatch(action: KasAction): KasState {
    const next = kasReducer(this.state, action);
    this.state = next;
    saveState(this.storage, this.state);
    this.listeners.forEach((fn) => fn(next));
    return next;
  }

  subscribe(fn: (state: KasState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  exportJson(): string {
    return exportJson(this.state);
  }

  exportCsv() {
    return exportCsv(this.state);
  }

  importJson(text: string): void {
    const next = importJson(text);
    this.state = next;
    saveState(this.storage, this.state);
    this.listeners.forEach((fn) => fn(next));
  }
}
