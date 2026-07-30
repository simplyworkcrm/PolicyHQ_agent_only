import React from 'react';
import { CheckCircle2, FileSearch, RefreshCcw } from 'lucide-react';

export const AmericoReconciliation: React.FC = () => (
  <div className="animate-in fade-in duration-300">
    <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-sm">
      <div className="flex flex-col gap-5 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-amber-300 shadow-lg shadow-slate-200">
            <RefreshCcw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Reconciliation</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Americo</h2>
            <p className="text-sm font-semibold text-slate-500">Carrier reconciliation workspace.</p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Available
        </span>
      </div>

      <div className="flex min-h-[420px] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-100 bg-slate-50 text-slate-400 shadow-inner">
            <FileSearch className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-lg font-black text-slate-950">No reconciliation batch selected</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Americo is enabled. Reconciliation records and workflow controls will appear here.
          </p>
        </div>
      </div>
    </section>
  </div>
);

export default AmericoReconciliation;
