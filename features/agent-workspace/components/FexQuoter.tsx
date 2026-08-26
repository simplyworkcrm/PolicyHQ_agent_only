import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Link2,
  Link2Off,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  FexCoverageType,
  FexPaymentType,
  FexQuoteInput,
  FexQuoteOutput,
  FexSex,
  FexTobacco,
  InsuranceToolkitsConnectionStatus,
  insuranceToolkitsApi,
} from '../services/insuranceToolkitsApi';

const states = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
  ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
  ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
  ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
] as const;

const coverageTypes: FexCoverageType[] = ['Level', 'Graded/Modified', 'Guaranteed', 'Limited Pay', 'SPWL'];
const tobaccoOptions: FexTobacco[] = ['None', 'Cigarettes', 'Cigarettes + Other Nicotine Products', 'Occasional pipe/cigar use only', 'Other Nicotine Products'];
const paymentTypes: FexPaymentType[] = ['Bank Draft/EFT', 'Direct Express', 'Credit Card', 'Debit Card'];

const inputClass = 'mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100 disabled:text-slate-400';
const labelClass = 'text-[10px] font-black uppercase tracking-[0.16em] text-slate-500';

type AmountMode = 'face' | 'premium';
type AgeMode = 'age' | 'dob';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const statusTone = (status: InsuranceToolkitsConnectionStatus | null) => {
  if (status?.connected) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status?.status === 'expired' || status?.status === 'error') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

export const FexQuoter: React.FC = () => {
  const [connection, setConnection] = useState<InsuranceToolkitsConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [amountMode, setAmountMode] = useState<AmountMode>('face');
  const [faceAmount, setFaceAmount] = useState('15000');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [ageMode, setAgeMode] = useState<AgeMode>('dob');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('65');
  const [state, setState] = useState('TX');
  const [sex, setSex] = useState<FexSex>('Male');
  const [coverageType, setCoverageType] = useState<FexCoverageType>('Level');
  const [tobacco, setTobacco] = useState<FexTobacco>('None');
  const [paymentType, setPaymentType] = useState<FexPaymentType>('Bank Draft/EFT');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [weight, setWeight] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [result, setResult] = useState<FexQuoteOutput | null>(null);

  const connected = connection?.connected === true;

  const loadStatus = async () => {
    setStatusLoading(true);
    setConnectionError('');
    try {
      setConnection(await insuranceToolkitsApi.getStatus());
    } catch (error) {
      setConnection(null);
      setConnectionError(getErrorMessage(error, 'Unable to check the InsuranceToolkits connection.'));
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    insuranceToolkitsApi.getStatus(controller.signal)
      .then(setConnection)
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setConnectionError(getErrorMessage(error, 'Unable to check the InsuranceToolkits connection.'));
      })
      .finally(() => setStatusLoading(false));
    return () => controller.abort();
  }, []);

  const handleConnect = async (event: FormEvent) => {
    event.preventDefault();
    setConnectionBusy(true);
    setConnectionError('');
    try {
      const next = await insuranceToolkitsApi.connect({ email: email.trim(), password });
      setConnection(next);
      setPassword('');
    } catch (error) {
      setConnectionError(getErrorMessage(error, 'Unable to connect InsuranceToolkits.'));
    } finally {
      setConnectionBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect InsuranceToolkits and remove its saved credentials?')) return;
    setConnectionBusy(true);
    setConnectionError('');
    try {
      await insuranceToolkitsApi.disconnect();
      setConnection({ connected: false, status: 'disconnected' });
      setResult(null);
    } catch (error) {
      setConnectionError(getErrorMessage(error, 'Unable to disconnect InsuranceToolkits.'));
    } finally {
      setConnectionBusy(false);
    }
  };

  const quoteSummary = useMemo(() => {
    if (!result) return null;
    const monthly = result.quotes.map(item => Number(item.monthly)).filter(Number.isFinite);
    return {
      count: result.quotes.length,
      lowest: monthly.length ? Math.min(...monthly) : null,
    };
  }, [result]);

  const handleQuote = async (event: FormEvent) => {
    event.preventDefault();
    setQuoteError('');
    setResult(null);

    if (!connected) {
      setQuoteError('Connect an InsuranceToolkits account before requesting a quote.');
      return;
    }

    const request: FexQuoteInput = {
      toolkit: 'FEX',
      coverageType,
      sex,
      state,
      tobacco,
      paymentType,
      underwritingItems: [],
    };

    if (amountMode === 'face') {
      const value = Number(faceAmount);
      if (!Number.isFinite(value) || value <= 0) return setQuoteError('Enter a valid face amount.');
      request.faceAmount = value;
    } else {
      const value = Number(premiumAmount);
      if (!Number.isFinite(value) || value <= 0) return setQuoteError('Enter a valid target premium.');
      request.premiumAmount = value;
    }

    if (ageMode === 'age') {
      const value = Number(age);
      if (!Number.isInteger(value) || value < 18 || value > 120) return setQuoteError('Enter an age from 18 through 120.');
      request.age = value;
    } else {
      const parts = dateOfBirth.split('-');
      if (parts.length !== 3) return setQuoteError('Enter a complete date of birth.');
      request.year = parts[0];
      request.month = parts[1];
      request.day = parts[2];
    }

    if (feet) request.feet = Number(feet);
    if (inches) request.inches = Number(inches);
    if (weight) request.weight = Number(weight);

    setQuoteLoading(true);
    try {
      setResult(await insuranceToolkitsApi.quoteFex(request));
    } catch (error) {
      setQuoteError(getErrorMessage(error, 'Unable to retrieve FEX quotes.'));
    } finally {
      setQuoteLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-200/60">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-amber-300">
              <Sparkles className="h-4 w-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.22em]">PolicyHQ Quoting</p>
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Final Expense Quoter</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Compare eligible InsuranceToolkits plans without leaving your PolicyHQ workspace.</p>
          </div>
          <div className={`min-w-72 rounded-2xl border px-4 py-3 ${statusTone(connection)}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {statusLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : connected ? <CheckCircle2 className="h-5 w-5" /> : <Link2Off className="h-5 w-5" />}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em]">InsuranceToolkits</p>
                  <p className="mt-0.5 text-sm font-black">{statusLoading ? 'Checking connection' : connected ? 'Connected' : 'Not connected'}</p>
                </div>
              </div>
              <button type="button" onClick={loadStatus} disabled={statusLoading} className="rounded-xl p-2 transition hover:bg-black/5 disabled:opacity-50" title="Refresh connection"><RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} /></button>
            </div>
            {connection?.account_email && <p className="mt-2 truncate text-xs font-bold opacity-75">{connection.account_email}</p>}
          </div>
        </div>
      </section>

      {connectionError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{connectionError}</span>
        </div>
      )}

      {!connected && !statusLoading && (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><Link2 className="h-5 w-5" /></div>
              <h3 className="mt-4 text-xl font-black text-slate-950">Connect your account</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Credentials are sent only to the authenticated PolicyHQ integration endpoint. They must be encrypted by the backend and are never stored in this browser.</p>
            </div>
            <form onSubmit={handleConnect} className="grid gap-4 sm:grid-cols-2">
              <label><span className={labelClass}>InsuranceToolkits email</span><input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className={inputClass} placeholder="agent@example.com" /></label>
              <label><span className={labelClass}>Password</span><input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className={inputClass} placeholder="Enter password" /></label>
              <button type="submit" disabled={connectionBusy} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-slate-950 shadow-lg shadow-amber-100 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
                {connectionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Connect securely
              </button>
            </form>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <form onSubmit={handleQuote} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Quote inputs</p><h3 className="mt-1 text-xl font-black text-slate-950">Client profile</h3></div>
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">FEX</div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>State</span><select value={state} onChange={event => setState(event.target.value)} className={inputClass}>{states.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            <label><span className={labelClass}>Sex</span><select value={sex} onChange={event => setSex(event.target.value as FexSex)} className={inputClass}><option>Male</option><option>Female</option></select></label>
            <label><span className={labelClass}>Coverage type</span><select value={coverageType} onChange={event => setCoverageType(event.target.value as FexCoverageType)} className={inputClass}>{coverageTypes.map(item => <option key={item}>{item}</option>)}</select></label>
            <label><span className={labelClass}>Payment type</span><select value={paymentType} onChange={event => setPaymentType(event.target.value as FexPaymentType)} className={inputClass}>{paymentTypes.map(item => <option key={item}>{item}</option>)}</select></label>
            <label className="sm:col-span-2"><span className={labelClass}>Tobacco usage</span><select value={tobacco} onChange={event => setTobacco(event.target.value as FexTobacco)} className={inputClass}>{tobaccoOptions.map(item => <option key={item}>{item}</option>)}</select></label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4"><span className={labelClass}>Quote by</span><div className="flex rounded-xl bg-white p-1 ring-1 ring-slate-200">{(['face', 'premium'] as AmountMode[]).map(mode => <button key={mode} type="button" onClick={() => setAmountMode(mode)} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${amountMode === mode ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-900'}`}>{mode === 'face' ? 'Face amount' : 'Premium'}</button>)}</div></div>
            {amountMode === 'face'
              ? <label className="mt-3 block"><span className={labelClass}>Face amount</span><input required type="number" min="1" step="1" value={faceAmount} onChange={event => setFaceAmount(event.target.value)} className={inputClass} /></label>
              : <label className="mt-3 block"><span className={labelClass}>Target monthly premium</span><input required type="number" min="1" step="0.01" value={premiumAmount} onChange={event => setPremiumAmount(event.target.value)} className={inputClass} /></label>}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4"><span className={labelClass}>Age input</span><div className="flex rounded-xl bg-white p-1 ring-1 ring-slate-200">{(['dob', 'age'] as AgeMode[]).map(mode => <button key={mode} type="button" onClick={() => setAgeMode(mode)} className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${ageMode === mode ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-900'}`}>{mode === 'dob' ? 'Date of birth' : 'Exact age'}</button>)}</div></div>
            {ageMode === 'dob'
              ? <label className="mt-3 block"><span className={labelClass}>Date of birth</span><input required type="date" value={dateOfBirth} onChange={event => setDateOfBirth(event.target.value)} className={inputClass} /></label>
              : <label className="mt-3 block"><span className={labelClass}>Age</span><input required type="number" min="18" max="120" value={age} onChange={event => setAge(event.target.value)} className={inputClass} /></label>}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3"><span className={labelClass}>Optional build</span><span className="text-[10px] font-bold text-slate-400">Improves underwriting accuracy</span></div>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <label><span className="text-xs font-bold text-slate-500">Feet</span><input type="number" min="1" max="8" value={feet} onChange={event => setFeet(event.target.value)} className={inputClass} /></label>
              <label><span className="text-xs font-bold text-slate-500">Inches</span><input type="number" min="0" max="11" value={inches} onChange={event => setInches(event.target.value)} className={inputClass} /></label>
              <label><span className="text-xs font-bold text-slate-500">Weight</span><input type="number" min="1" value={weight} onChange={event => setWeight(event.target.value)} className={inputClass} /></label>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs font-semibold leading-5 text-blue-900"><span className="font-black">Basic quoting:</span> medication and health-condition questionnaires will be added in the underwriting phase. This request currently sends an empty <code className="font-black">underwritingItems</code> array.</div>
          {quoteError && <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{quoteError}</div>}
          <button type="submit" disabled={!connected || quoteLoading} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 text-sm font-black text-slate-950 shadow-lg shadow-amber-100 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
            {quoteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}{quoteLoading ? 'Retrieving quotes…' : connected ? 'Get FEX quotes' : 'Connect to start quoting'}
          </button>
        </form>

        <section className="min-h-[36rem] rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Carrier results</p><h3 className="mt-1 text-xl font-black text-slate-950">Available plans</h3></div>
            {quoteSummary && <div className="text-right"><p className="text-2xl font-black text-slate-950">{quoteSummary.count}</p><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Quotes</p></div>}
          </div>

          {!result && !quoteLoading && <div className="flex min-h-[30rem] flex-col items-center justify-center px-6 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400"><CircleDollarSign className="h-7 w-7" /></div><h4 className="mt-5 text-lg font-black text-slate-900">Ready for a client profile</h4><p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">Complete the quote inputs to compare premiums, plan tiers, benefits, warnings, and excluded carriers.</p></div>}
          {quoteLoading && <div className="flex min-h-[30rem] flex-col items-center justify-center text-center"><Loader2 className="h-9 w-9 animate-spin text-amber-500" /><p className="mt-4 text-sm font-black text-slate-800">Comparing carrier plans</p><p className="mt-1 text-xs font-semibold text-slate-400">InsuranceToolkits is processing the quote.</p></div>}

          {result && (
            <div className="mt-4 space-y-3">
              {quoteSummary?.lowest !== null && <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"><div className="flex items-center gap-3"><BadgeCheck className="h-5 w-5 text-emerald-600" /><div><p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Lowest monthly</p><p className="text-lg font-black text-emerald-950">{money.format(quoteSummary!.lowest!)}</p></div></div><p className="text-xs font-bold text-emerald-700">{result.quotes.length} plans found</p></div>}
              {result.quotes.length === 0 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center"><p className="font-black text-slate-800">No eligible quotes returned</p><p className="mt-2 text-sm font-semibold text-slate-500">Review excluded carriers below or adjust the client profile.</p></div>}
              {result.quotes.map((quote, index) => (
                <article key={`${quote.company}-${quote.plan_name || 'plan'}-${index}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-amber-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><p className="truncate text-base font-black text-slate-950">{quote.company || 'Unknown carrier'}</p><p className="mt-1 text-xs font-bold text-slate-500">{[quote.plan_name, quote.tier_name].filter(Boolean).join(' · ') || 'Final expense plan'}</p></div>
                    <div className="shrink-0 text-right"><p className="text-xl font-black text-slate-950">{Number.isFinite(Number(quote.monthly)) ? money.format(Number(quote.monthly)) : '—'}</p><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Monthly</p></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs"><div><p className="font-bold text-slate-400">Face amount</p><p className="mt-1 font-black text-slate-800">{Number.isFinite(Number(quote.face_amount)) ? money.format(Number(quote.face_amount)) : '—'}</p></div><div><p className="font-bold text-slate-400">Annual premium</p><p className="mt-1 font-black text-slate-800">{Number.isFinite(Number(quote.yearly)) ? money.format(Number(quote.yearly)) : '—'}</p></div></div>
                  {quote.warning && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-900">{quote.warning}</p>}
                  {quote.plan_info && <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{quote.plan_info}</p>}
                  {quote.eapp_link && <a href={quote.eapp_link} target="_blank" rel="noreferrer" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 text-xs font-black text-white transition hover:bg-slate-800">Start application <ArrowUpRight className="h-3.5 w-3.5" /></a>}
                </article>
              ))}
              {result.excluded.length > 0 && <div className="pt-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Excluded carriers</p><div className="mt-2 space-y-2">{result.excluded.map((item, index) => <div key={`${item.name}-${index}`} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5"><p className="text-xs font-black text-red-950">{item.name}</p><p className="mt-1 text-xs font-semibold leading-5 text-red-700">{item.why}</p></div>)}</div></div>}
            </div>
          )}
        </section>
      </div>

      {connected && <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-slate-800">Connection management</p><p className="mt-1 text-xs font-semibold text-slate-500">Disconnecting removes the saved InsuranceToolkits credentials and cached tokens.</p></div><button type="button" onClick={handleDisconnect} disabled={connectionBusy} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50">{connectionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />} Disconnect</button></div>}
    </div>
  );
};

export default FexQuoter;
