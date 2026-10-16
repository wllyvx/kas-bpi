export const TARGET_PER_MEMBER = 20000;
export const SCHEMA_VERSION = 1;

export type Status = 'belum bayar' | 'sebagian' | 'sudah bayar';

export interface Member {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  archivedAt?: number;
}

export interface CashIn {
  id: string;
  memberId: string;
  period: string;
  amount: number;
  note?: string;
  createdAt: number;
}

export interface CashOut {
  id: string;
  note: string;
  amount: number;
  createdAt: number;
}

export interface KasState {
  version: number;
  members: Member[];
  cashIn: CashIn[];
  cashOut: CashOut[];
}

export type KasAction =
  | { type: 'ADD_MEMBER'; name: string }
  | { type: 'EDIT_MEMBER'; id: string; name: string }
  | { type: 'ARCHIVE_MEMBER'; id: string; restore?: boolean }
  | { type: 'DELETE_MEMBER'; id: string }
  | { type: 'ADD_CASH_IN'; memberId: string; period: string; amount: number }
  | { type: 'EDIT_CASH_IN'; id: string; memberId: string; period: string; amount: number }
  | { type: 'DELETE_CASH_IN'; id: string }
  | { type: 'ADD_CASH_OUT'; note: string; amount: number }
  | { type: 'EDIT_CASH_OUT'; id: string; note: string; amount: number }
  | { type: 'DELETE_CASH_OUT'; id: string }
  | { type: 'REPLACE_STATE'; state: KasState };

export function newId(): string {
  return crypto.randomUUID();
}

export function initialState(): KasState {
  return { version: SCHEMA_VERSION, members: [], cashIn: [], cashOut: [] };
}

export function currentPeriod(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function requirePositiveInteger(amount: unknown): number {
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) throw new Error('Jumlah harus berupa bilangan bulat lebih besar dari 0');
  return amount;
}

function findMember(state: KasState, id: string): Member {
  const member = state.members.find((m) => m.id === id);
  if (!member) throw new Error('Anggota tidak ditemukan');
  return member;
}

function findCashIn(state: KasState, id: string): CashIn {
  const entry = state.cashIn.find((c) => c.id === id);
  if (!entry) throw new Error('Transaksi tidak ditemukan');
  return entry;
}

function findCashOut(state: KasState, id: string): CashOut {
  const entry = state.cashOut.find((c) => c.id === id);
  if (!entry) throw new Error('Transaksi tidak ditemukan');
  return entry;
}

export function kasReducer(state: KasState, action: KasAction): KasState {
  switch (action.type) {
    case 'ADD_MEMBER': {
      const name = action.name.trim();
      if (!name) throw new Error('Nama anggota tidak boleh kosong');
      return {
        ...state,
        members: [
          ...state.members,
          { id: newId(), name, active: true, createdAt: Date.now() },
        ],
      };
    }
    case 'EDIT_MEMBER': {
      findMember(state, action.id);
      const name = action.name.trim();
      if (!name) throw new Error('Nama anggota tidak boleh kosong');
      return {
        ...state,
        members: state.members.map((m) => (m.id === action.id ? { ...m, name } : m)),
      };
    }
    case 'ARCHIVE_MEMBER': {
      findMember(state, action.id);
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === action.id ? { ...m, active: false, archivedAt: Date.now() } : m
        ),
      };
    }
    case 'DELETE_MEMBER': {
      findMember(state, action.id);
      return {
        ...state,
        members: state.members.filter((m) => m.id !== action.id),
        cashIn: state.cashIn.filter((c) => c.memberId !== action.id),
      };
    }
    case 'ADD_CASH_IN': {
      const member = findMember(state, action.memberId);
      if (!member.active) throw new Error('Anggota tidak aktif atau tidak ditemukan');
      if (!PERIOD_RE.test(action.period)) throw new Error('Periode tidak valid (YYYY-MM)');
      requirePositiveInteger(action.amount);
      return {
        ...state,
        cashIn: [
          ...state.cashIn,
          {
            id: newId(),
            memberId: action.memberId,
            period: action.period,
            amount: action.amount,
            createdAt: Date.now(),
          },
        ],
      };
    }
    case 'EDIT_CASH_IN': {
      const entry = findCashIn(state, action.id);
      const member = findMember(state, action.memberId);
      if (!member.active) throw new Error('Anggota tidak aktif atau tidak ditemukan');
      if (!PERIOD_RE.test(action.period)) throw new Error('Periode tidak valid (YYYY-MM)');
      requirePositiveInteger(action.amount);
      return {
        ...state,
        cashIn: state.cashIn.map((c) =>
          c.id === action.id
            ? { ...c, memberId: action.memberId, period: action.period, amount: action.amount }
            : c
        ),
      };
    }
    case 'DELETE_CASH_IN': {
      findCashIn(state, action.id);
      return {
        ...state,
        cashIn: state.cashIn.filter((c) => c.id !== action.id),
      };
    }
    case 'ADD_CASH_OUT': {
      const note = action.note.trim();
      if (!note) throw new Error('Keterangan pengeluaran tidak boleh kosong');
      requirePositiveInteger(action.amount);
      return {
        ...state,
        cashOut: [
          ...state.cashOut,
          { id: newId(), note, amount: action.amount, createdAt: Date.now() },
        ],
      };
    }
    case 'EDIT_CASH_OUT': {
      findCashOut(state, action.id);
      const note = action.note.trim();
      if (!note) throw new Error('Keterangan pengeluaran tidak boleh kosong');
      requirePositiveInteger(action.amount);
      return {
        ...state,
        cashOut: state.cashOut.map((c) =>
          c.id === action.id ? { ...c, note, amount: action.amount } : c
        ),
      };
    }
    case 'DELETE_CASH_OUT': {
      findCashOut(state, action.id);
      return {
        ...state,
        cashOut: state.cashOut.filter((c) => c.id !== action.id),
      };
    }
    case 'REPLACE_STATE': {
      return action.state;
    }
  }
}

export function balance(state: KasState): number {
  const inTotal = state.cashIn.reduce((sum, c) => sum + c.amount, 0);
  const outTotal = state.cashOut.reduce((sum, c) => sum + c.amount, 0);
  return inTotal - outTotal;
}

export function sumsByMemberPeriod(state: KasState): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  for (const c of state.cashIn) {
    let byMember = result.get(c.period);
    if (!byMember) {
      byMember = new Map();
      result.set(c.period, byMember);
    }
    byMember.set(c.memberId, (byMember.get(c.memberId) ?? 0) + c.amount);
  }
  return result;
}

export function periodList(state: KasState): string[] {
  const periods = new Set<string>([currentPeriod()]);
  for (const c of state.cashIn) periods.add(c.period);
  return [...periods].sort().reverse();
}

export function targetForPeriod(state: KasState, period: string): number {
  let count: number;
  if (period === currentPeriod()) {
    count = state.members.filter((m) => m.active).length;
  } else {
    count = new Set(state.cashIn.filter((c) => c.period === period).map((c) => c.memberId)).size;
  }
  return count * TARGET_PER_MEMBER;
}

const STATUS_RANK: Record<Status, number> = { 'belum bayar': 0, sebagian: 1, 'sudah bayar': 2 };

export function memberProgress(state: KasState, memberId: string, period: string) {
  const member = findMember(state, memberId);
  const sum = state.cashIn
    .filter((c) => c.memberId === memberId && c.period === period)
    .reduce((sum, c) => sum + c.amount, 0);
  const target = TARGET_PER_MEMBER;
  let status: Status;
  if (sum >= target) status = 'sudah bayar';
  else if (sum > 0) status = 'sebagian';
  else status = 'belum bayar';
  return {
    memberId,
    name: member.name,
    active: member.active,
    sum,
    target,
    remaining: Math.max(0, target - sum),
    kelebihan: Math.max(0, sum - target),
    pct: Math.min(Math.round((sum / target) * 100), 100),
    status,
  };
}

export function membersForPeriod(state: KasState, period: string) {
  const isCurrent = period === currentPeriod();
  const ids = isCurrent
    ? state.members.filter((m) => m.active).map((m) => m.id)
    : [...new Set(state.cashIn.filter((c) => c.period === period).map((c) => c.memberId))];
  return ids
    .map((id) => ({ id, progress: memberProgress(state, id, period) }))
    .sort((a, b) => STATUS_RANK[a.progress.status] - STATUS_RANK[b.progress.status] || a.progress.name.localeCompare(b.progress.name));
}

export function cashInForPeriod(state: KasState, period: string, memberId?: string) {
  return state.cashIn
    .filter((c) => c.period === period && (memberId === undefined || c.memberId === memberId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function recentCashOut(state: KasState) {
  return [...state.cashOut].sort((a, b) => b.createdAt - a.createdAt);
}
