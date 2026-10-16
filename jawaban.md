Q1: accept single-user, no auth
Q2: accept managed member list, name only, archive/inactive
Q3: accept calendar month YYYY-MM, Asia/Jakarta
Q4: accept ledger of cash-in per (member,period), default current month, status belum/sebagian/sudah
Q5: accept all cash-in treated as member payments tied to member+period
Q6: accept cash-out reduces balance only, note required, no attachment
Q7: accept header shows cash balance (total in - total out), optional collected/target this month
Q8: accept current month default, status/order by sebagian/unpaid then name, month selector, show paid/remaining/progress
Q9: accept canonical terms Member, CashIn, CashOut, Period, Payment, use Indonesian UI
Q10: accept localStorage + export/import CSV/JSON
Q11: accept UUID v4, integer Rupiah, amounts>0, versioned localStorage, version in exports
Q12: accept archive excludes from new/current target; remains in history
Q13: accept month selector from activity union current; default current month
Q14: status sudah bayar when sum>=20000; progress bar capped at 100%; remaining Rp0; optional "kelebihan RpX"; surplus stays in period (no rollover)
Q15: accept JSON full snapshot + separate CSVs; import replace with confirmation; validate schema/version
Q16: accept validations as stated; no duplicate enforcement for MVP
Q17: accept mobile-first, two buttons, progress list, optional recent, light theme for MVP
Q18: accept delete/edit as specified for MVP
Q19: accept onboarding if no members; cash-out allowed anytime; historical target based on members with activity or existed; current month uses active count
Q20: accept SPA single view, PRD to cover overview/goals/scope/flows/data model/UI/status/export/import/non-goals/assumptions/acceptance criteria
