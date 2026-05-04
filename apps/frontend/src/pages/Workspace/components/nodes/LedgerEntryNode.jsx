import { BookOpen } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';

const ACCOUNT_TYPES = ['Assets','Liabilities','Equity','Revenue','Expenses','Bank','Cash','Receivables','Payables','Tax'];

export default function LedgerEntryNode({ config = {}, updateConfig, nodeId }) {
  const mode        = config.mode        ?? 'add'; // add | query | balance | report
  const date        = config.date        ?? '';
  const description = config.description ?? '';
  const debitAccount= config.debitAccount?? '';
  const creditAccount=config.creditAccount?? '';
  const amount      = config.amount      ?? '';
  const currency    = config.currency    ?? 'INR';
  const reference   = config.reference   ?? '';
  const tags        = config.tags        ?? '';
  const ledgerId    = config.ledgerId    ?? 'default';
  const queryFilter = config.queryFilter ?? '';
  const fromDate    = config.fromDate    ?? '';
  const toDate      = config.toDate      ?? '';

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Ledger Entry</div>
          <div className="text-[11px] text-zinc-500">Double-entry bookkeeping — log debit/credit entries</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Action</label>
        <div className="flex gap-1.5">
          {[
            { value: 'add',     label: 'Add Entry' },
            { value: 'query',   label: 'Query' },
            { value: 'balance', label: 'Get Balance' },
            { value: 'report',  label: 'P&L Report' },
          ].map((m) => (
            <button key={m.value} onClick={() => updateConfig('mode', m.value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${mode === m.value ? 'bg-teal-500/20 border-teal-500/40 text-teal-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Ledger ID</label>
        <input value={ledgerId} onChange={(e) => updateConfig('ledgerId', e.target.value)} placeholder="default"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
        <p className="text-[10px] text-zinc-600 mt-1">Namespace for your books — use different IDs per company/project</p>
      </div>

      {mode === 'add' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Date</label>
            <SmartVariableInput value={date} onChange={(v) => updateConfig('date', v)} placeholder="{{ $now }}  or  2024-04-01" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description / Narration</label>
            <SmartVariableInput value={description} onChange={(v) => updateConfig('description', v)}
              placeholder="Invoice #{{ $json.invoiceNo }} payment received" multiline />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Debit Account (Dr)</label>
              <SmartVariableInput value={debitAccount} onChange={(v) => updateConfig('debitAccount', v)} placeholder="Bank / Assets" />
              <div className="flex flex-wrap gap-1 mt-1">
                {ACCOUNT_TYPES.slice(0, 5).map((a) => (
                  <button key={a} onClick={() => updateConfig('debitAccount', a)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Credit Account (Cr)</label>
              <SmartVariableInput value={creditAccount} onChange={(v) => updateConfig('creditAccount', v)} placeholder="Revenue / Payables" />
              <div className="flex flex-wrap gap-1 mt-1">
                {ACCOUNT_TYPES.slice(5).map((a) => (
                  <button key={a} onClick={() => updateConfig('creditAccount', a)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-[2]">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Amount</label>
              <SmartVariableInput value={amount} onChange={(v) => updateConfig('amount', v)} placeholder="{{ $json.amount }}" />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Currency</label>
              <input value={currency} onChange={(e) => updateConfig('currency', e.target.value)} placeholder="INR"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 font-mono focus:outline-none focus:border-zinc-500" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Reference Number (optional)</label>
            <SmartVariableInput value={reference} onChange={(v) => updateConfig('reference', v)} placeholder="{{ $json.invoiceId }}" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tags (optional)</label>
            <SmartVariableInput value={tags} onChange={(v) => updateConfig('tags', v)} placeholder="q1, client-a, gst" />
          </div>
        </>
      )}

      {(mode === 'query' || mode === 'balance') && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
            {mode === 'balance' ? 'Account Name' : 'Search / Filter'}
          </label>
          <SmartVariableInput value={queryFilter} onChange={(v) => updateConfig('queryFilter', v)}
            placeholder={mode === 'balance' ? 'Bank' : 'account:Revenue  or  tag:q1'} />
        </div>
      )}

      {(mode === 'query' || mode === 'report') && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">From Date</label>
            <input type="date" value={fromDate} onChange={(e) => updateConfig('fromDate', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">To Date</label>
            <input type="date" value={toDate} onChange={(e) => updateConfig('toDate', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
        </div>
      )}

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        {mode === 'add'     && <>Returns: <span className="text-zinc-300">entryId, debit, credit, amount, date, balance</span></>}
        {mode === 'query'   && <>Returns: <span className="text-zinc-300">entries[], totalDebit, totalCredit</span></>}
        {mode === 'balance' && <>Returns: <span className="text-zinc-300">account, balance, currency, lastEntry</span></>}
        {mode === 'report'  && <>Returns: <span className="text-zinc-300">revenue, expenses, netProfit, accounts{}</span></>}
      </div>
    </div>
  );
}
