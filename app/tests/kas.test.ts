import { describe, it, expect } from 'bun:test';
import {
  TARGET_PER_MEMBER,
  initialState,
  kasReducer,
  balance,
  currentPeriod,
  memberProgress,
  membersForPeriod,
  periodList,
  targetForPeriod,
  type CashIn,
  type CashOut,
  type Member,
  type Status,
} from '../src/lib/kas.ts';

function member(name: string, active = true): Member {
  return { id: 'm-1', name, active, createdAt: 1000 };
}

function stateWith(memberOverride?: Partial<Member>, cashIn: CashIn[] = [], cashOut: CashOut[] = []) {
  return {
    version: 1,
    members: [memberOverride ? { ...member('X', memberOverride.active ?? true), ...memberOverride } : member('X')],
    cashIn,
    cashOut,
  };
}

describe('initialState', () => {
  it('has version 1 and empty collections', () => {
    const s = initialState();
    expect(s.version).toBe(1);
    expect(s.members).toEqual([]);
    expect(s.cashIn).toEqual([]);
    expect(s.cashOut).toEqual([]);
  });
});

describe('members', () => {
  it('adds a member with id, name, active flag and createdAt', () => {
    const s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: 'Budi' });
    expect(s.members).toHaveLength(1);
    expect(s.members[0].name).toBe('Budi');
    expect(s.members[0].active).toBe(true);
    expect(typeof s.members[0].id).toBe('string');
    expect(typeof s.members[0].createdAt).toBe('number');
  });

  it('trims member name', () => {
    const s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: '  Budi  ' });
    expect(s.members[0].name).toBe('Budi');
  });

  it('rejects empty member name', () => {
    expect(() => kasReducer(initialState(), { type: 'ADD_MEMBER', name: '   ' })).toThrow('Nama anggota');
  });

  it('allows duplicate names', () => {
    let s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: 'Budi' });
    s = kasReducer(s, { type: 'ADD_MEMBER', name: 'Budi' });
    expect(s.members).toHaveLength(2);
  });

  it('edits a member name', () => {
    let s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: 'Budi' });
    const id = s.members[0].id;
    s = kasReducer(s, { type: 'EDIT_MEMBER', id, name: 'Budi Santoso' });
    expect(s.members[0].name).toBe('Budi Santoso');
  });

  it('rejects editing unknown member', () => {
    expect(() => kasReducer(initialState(), { type: 'EDIT_MEMBER', id: 'nope', name: 'X' })).toThrow('Anggota tidak ditemukan');
  });

  it('archives a member', () => {
    let s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: 'Budi' });
    const id = s.members[0].id;
    s = kasReducer(s, { type: 'ARCHIVE_MEMBER', id });
    const m = s.members[0];
    expect(m.active).toBe(false);
    expect(typeof m.archivedAt).toBe('number');
  });

  it('rejects archiving unknown member', () => {
    expect(() => kasReducer(initialState(), { type: 'ARCHIVE_MEMBER', id: 'nope' })).toThrow('Anggota tidak ditemukan');
  });

  it('deletes a member and cascades their cash-in entries', () => {
    let s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: 'Budi' });
    const id = s.members[0].id;
    s = kasReducer(s, { type: 'ADD_CASH_IN', memberId: id, period: '2026-10', amount: 5000 });
    s = kasReducer(s, { type: 'DELETE_MEMBER', id });
    expect(s.members).toHaveLength(0);
    expect(s.cashIn).toHaveLength(0);
  });

  it('rejects deleting unknown member', () => {
    expect(() => kasReducer(initialState(), { type: 'DELETE_MEMBER', id: 'nope' })).toThrow('Anggota tidak ditemukan');
  });
});

describe('cash-in', () => {
  function base() {
    let s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: 'Budi' });
    return { s, memberId: s.members[0].id };
  }

  it('adds a cash-in ledger entry', () => {
    const { s, memberId } = base();
    const next = kasReducer(s, { type: 'ADD_CASH_IN', memberId, period: '2026-10', amount: 5000 });
    expect(next.cashIn).toHaveLength(1);
    const c = next.cashIn[0];
    expect(c.memberId).toBe(memberId);
    expect(c.period).toBe('2026-10');
    expect(c.amount).toBe(5000);
    expect(typeof c.id).toBe('string');
    expect(typeof c.createdAt).toBe('number');
  });

  it('rejects cash-in for unknown member', () => {
    const { s } = base();
    expect(() => kasReducer(s, { type: 'ADD_CASH_IN', memberId: 'nope', period: '2026-10', amount: 5000 })).toThrow('Anggota tidak ditemukan');
  });

  it('rejects cash-in for archived member', () => {
    let s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: 'Budi' });
    const id = s.members[0].id;
    s = kasReducer(s, { type: 'ARCHIVE_MEMBER', id });
    expect(() => kasReducer(s, { type: 'ADD_CASH_IN', memberId: id, period: '2026-10', amount: 5000 })).toThrow('tidak aktif');
  });

  it('rejects invalid period', () => {
    const { s, memberId } = base();
    for (const period of ['2026-13', '2026-00', '10-2026', 'abc', '2026-1', '2026-10-01']) {
      expect(() => kasReducer(s, { type: 'ADD_CASH_IN', memberId, period, amount: 5000 })).toThrow('Periode tidak valid');
    }
  });

  it('rejects amount zero, negative, or non-integer', () => {
    const { s, memberId } = base();
    for (const amount of [0, -1000, 10.5]) {
      expect(() => kasReducer(s, { type: 'ADD_CASH_IN', memberId, period: '2026-10', amount })).toThrow('Jumlah');
    }
  });

  it('accumulates multiple cash-ins per member and period', () => {
    const { s, memberId } = base();
    let next = kasReducer(s, { type: 'ADD_CASH_IN', memberId, period: '2026-10', amount: 7000 });
    next = kasReducer(next, { type: 'ADD_CASH_IN', memberId, period: '2026-10', amount: 8000 });
    next = kasReducer(next, { type: 'ADD_CASH_IN', memberId, period: '2026-09', amount: 20000 });
    expect(next.cashIn).toHaveLength(3);
  });

  it('edits a cash-in entry', () => {
    const { s, memberId } = base();
    let next = kasReducer(s, { type: 'ADD_CASH_IN', memberId, period: '2026-10', amount: 5000 });
    const id = next.cashIn[0].id;
    next = kasReducer(next, { type: 'EDIT_CASH_IN', id, memberId, period: '2026-09', amount: 15000 });
    const c = next.cashIn.find((x) => x.id)!;
    expect(c.period).toBe('2026-09');
    expect(c.amount).toBe(15000);
  });

  it('rejects editing unknown cash-in', () => {
    const { s, memberId } = base();
    expect(() => kasReducer(s, { type: 'EDIT_CASH_IN', id: 'nope', memberId, period: '2026-10', amount: 5000 })).toThrow('Transaksi tidak ditemukan');
  });

  it('deletes a cash-in entry', () => {
    const { s, memberId } = base();
    let next = kasReducer(s, { type: 'ADD_CASH_IN', memberId, period: '2026-10', amount: 5000 });
    const id = next.cashIn[0].id;
    next = kasReducer(next, { type: 'DELETE_CASH_IN', id });
    expect(next.cashIn).toHaveLength(0);
  });
});

describe('cash-out', () => {
  it('adds a cash-out entry', () => {
    const s = kasReducer(initialState(), { type: 'ADD_CASH_OUT', note: 'Beli cemilan', amount: 4000 });
    expect(s.cashOut).toHaveLength(1);
    expect(s.cashOut[0].note).toBe('Beli cemilan');
    expect(s.cashOut[0].amount).toBe(4000);
  });

  it('trims note', () => {
    const s = kasReducer(initialState(), { type: 'ADD_CASH_OUT', note: '  cuci  ', amount: 2000 });
    expect(s.cashOut[0].note).toBe('cuci');
  });

  it('rejects empty note', () => {
    expect(() => kasReducer(initialState(), { type: 'ADD_CASH_OUT', note: '   ', amount: 1000 })).toThrow('Keterangan');
  });

  it('rejects invalid amount', () => {
    expect(() => kasReducer(initialState(), { type: 'ADD_CASH_OUT', note: 'x', amount: 0 })).toThrow('Jumlah');
    expect(() => kasReducer(initialState(), { type: 'ADD_CASH_OUT', note: 'x', amount: -500 })).toThrow('Jumlah');
    expect(() => kasReducer(initialState(), { type: 'ADD_CASH_OUT', note: 'x', amount: 2.5 })).toThrow('Jumlah');
  });

  it('edits and deletes cash-out', () => {
    let s = kasReducer(initialState(), { type: 'ADD_CASH_OUT', note: 'A', amount: 1000 });
    const id = s.cashOut[0].id;
    s = kasReducer(s, { type: 'EDIT_CASH_OUT', id, note: 'B', amount: 3000 });
    expect(s.cashOut[0].note).toBe('B');
    expect(s.cashOut[0].amount).toBe(3000);
    s = kasReducer(s, { type: 'DELETE_CASH_OUT', id });
    expect(s.cashOut).toHaveLength(0);
  });
});

describe('balance', () => {
  it('equals total cash-in minus total cash-out', () => {
    let s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: 'Budi' });
    const id = s.members[0].id;
    s = kasReducer(s, { type: 'ADD_CASH_IN', memberId: id, period: '2026-10', amount: 50000 });
    s = kasReducer(s, { type: 'ADD_CASH_IN', memberId: id, period: '2026-10', amount: 30000 });
    s = kasReducer(s, { type: 'ADD_CASH_OUT', note: 'listrik', amount: 12000 });
    expect(balance(s)).toBe(68000);
  });
});

describe('currentPeriod', () => {
  it('returns YYYY-MM in Asia/Jakarta', () => {
    expect(currentPeriod()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('status and progress', () => {
  const memberId = 'm-1';

  it('no cash-in means belum bayar with full remaining', () => {
    const s = stateWith({ id: memberId });
    const p = memberProgress(s, memberId, '2026-10');
    expect(p.status).toBe('belum bayar');
    expect(p.sum).toBe(0);
    expect(p.remaining).toBe(20000);
    expect(p.kelebihan).toBe(0);
    expect(p.pct).toBe(0);
  });

  it('partial payment is sebagian', () => {
    const s = stateWith({ id: memberId }, [{ id: 'c-1', memberId, period: '2026-10', amount: 7000, createdAt: 1 }]);
    const p = memberProgress(s, memberId, '2026-10');
    expect(p.status).toBe('sebagian');
    expect(p.sum).toBe(7000);
    expect(p.remaining).toBe(13000);
    expect(p.pct).toBe(35);
  });

  it('exact target is sudah bayar', () => {
    const s = stateWith({ id: memberId }, [{ id: 'c-1', memberId, period: '2026-10', amount: 20000, createdAt: 1 }]);
    const p = memberProgress(s, memberId, '2026-10');
    expect(p.status).toBe('sudah bayar');
    expect(p.remaining).toBe(0);
    expect(p.kelebihan).toBe(0);
    expect(p.pct).toBe(100);
  });

  it('overpayment caps progress and shows kelebihan', () => {
    const s = stateWith({ id: memberId }, [{ id: 'c-1', memberId, period: '2026-10', amount: 25000, createdAt: 1 }]);
    const p = memberProgress(s, memberId, '2026-10');
    expect(p.status).toBe('sudah bayar');
    expect(p.remaining).toBe(0);
    expect(p.kelebihan).toBe(5000);
    expect(p.pct).toBe(100);
  });
});

describe('targetForPeriod', () => {
  it('current month target uses active members', () => {
    const s = {
      version: 1,
      members: [
        { id: 'a', name: 'A', active: true, createdAt: 1 },
        { id: 'b', name: 'B', active: false, createdAt: 2 },
        { id: 'c', name: 'C', active: true, createdAt: 3 },
      ],
      cashIn: [],
      cashOut: [],
    };
    expect(targetForPeriod(s, currentPeriod())).toBe(2 * TARGET_PER_MEMBER);
  });

  it('historical period target uses members with activity in that period', () => {
    const s = {
      version: 1,
      members: [
        { id: 'a', name: 'A', active: true, createdAt: 1 },
        { id: 'b', name: 'B', active: false, createdAt: 2 },
        { id: 'c', name: 'C', active: true, createdAt: 3 },
      ],
      cashIn: [
        { id: 'c1', memberId: 'a', period: '2026-08', amount: 5000, createdAt: 1 },
        { id: 'c2', memberId: 'b', period: '2026-08', amount: 20000, createdAt: 2 },
      ],
      cashOut: [],
    };
    expect(targetForPeriod(s, '2026-08')).toBe(2 * TARGET_PER_MEMBER);
  });
});

describe('periodList', () => {
  it('defaults to current month when empty', () => {
    expect(periodList(initialState())).toEqual([currentPeriod()]);
  });

  it('lists unique periods with activity plus current month, newest first', () => {
    let s = kasReducer(initialState(), { type: 'ADD_MEMBER', name: 'A' });
    const id = s.members[0].id;
    s = kasReducer(s, { type: 'ADD_CASH_IN', memberId: id, period: '2026-08', amount: 1000 });
    s = kasReducer(s, { type: 'ADD_CASH_IN', memberId: id, period: '2026-08', amount: 1000 });
    s = kasReducer(s, { type: 'ADD_CASH_IN', memberId: id, period: '2026-09', amount: 1000 });
    const list = periodList(s);
    expect(list).toContain(currentPeriod());
    expect(list).toContain('2026-09');
    expect(list).toContain('2026-08');
    expect(list.indexOf('2026-09') < list.indexOf('2026-08')).toBe(true);
    expect(list.filter((p) => p === '2026-08')).toHaveLength(1);
  });
});

describe('membersForPeriod', () => {
  const baseState = () => ({
    version: 1,
    members: [
      { id: 'a', name: 'Zara', active: true, createdAt: 1 },
      { id: 'b', name: 'Amir', active: true, createdAt: 2 },
      { id: 'c', name: 'Budi', active: false, createdAt: 3 },
    ],
    cashIn: [
      { id: 'c1', memberId: 'a', period: '2026-10', amount: 0, createdAt: 1 },
      { id: 'c2', memberId: 'b', period: '2026-10', amount: 10000, createdAt: 2 },
    ],
    cashOut: [],
  });

  it('current period shows active members ordered by urgency then name', () => {
    const s = baseState();
    const list = membersForPeriod(s, currentPeriod());
    expect(list.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('excludes archived members from current period', () => {
    const s = baseState();
    const list = membersForPeriod(s, currentPeriod());
    expect(list.map((m) => m.id)).not.toContain('c');
  });

  it('historical period includes archived members with activity', () => {
    const s = {
      ...baseState(),
      cashIn: [...baseState().cashIn, { id: 'c3', memberId: 'c', period: '2026-09', amount: 20000, createdAt: 3 }],
    };
    const list = membersForPeriod(s, '2026-09');
    expect(list.map((m) => m.id)).toContain('c');
    expect(list.map((m) => m.id)).not.toContain('a');
  });
});

describe('replace state', () => {
  it('REPLACE_STATE accepts a full state', () => {
    const s = kasReducer(initialState(), { type: 'REPLACE_STATE', state: stateWith() });
    expect(s.members).toHaveLength(1);
  });
});
