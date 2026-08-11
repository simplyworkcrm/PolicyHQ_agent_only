import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, ChevronRight, Coins, Crown, Flame, GitBranch, HeartPulse, Loader2, LockKeyhole, Medal, Orbit, Pencil, ShieldCheck, Sparkles, Star, Target, Timer, Trophy, Users, Zap } from 'lucide-react';
import greenCoupleGif from '../assets/green_couple_360.gif';
import redCoupleGif from '../assets/red_couple_360.gif';
import { FflIssuePaidRecord, fflIssuePaidApi } from '../services/fflIssuePaidApi';

type TrackId = 'personal' | 'agency' | 'hall-of-fame';

type Track = {
  id: TrackId;
  label: string;
  eyebrow: string;
  current: number;
  goal: number;
  description: string;
  accent: string;
};

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const exactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function BusinessGamification({
  selectedAgentId,
  view = 'agent',
}: {
  selectedAgentId: string;
  view?: 'agent' | 'agency';
}) {
  const [activeTrack, setActiveTrack] = useState<TrackId>(view === 'agency' ? 'agency' : 'hall-of-fame');
  const [personalGoal, setPersonalGoal] = useState(250000);
  const [goalDraft, setGoalDraft] = useState('250000');
  const [editingGoal, setEditingGoal] = useState(false);
  const [issuePaid, setIssuePaid] = useState<FflIssuePaidRecord | null>(null);
  const [issuePaidLoading, setIssuePaidLoading] = useState(false);
  const [issuePaidError, setIssuePaidError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAgentId) {
      setIssuePaid(null);
      return;
    }

    let cancelled = false;
    setIssuePaidLoading(true);
    setIssuePaidError(null);

    fflIssuePaidApi.getByAgentId(selectedAgentId)
      .then(record => {
        if (!cancelled) setIssuePaid(record);
      })
      .catch(error => {
        if (!cancelled) {
          setIssuePaid(null);
          setIssuePaidError(error instanceof Error ? error.message : 'Failed to load FFL qualification data.');
        }
      })
      .finally(() => {
        if (!cancelled) setIssuePaidLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAgentId]);

  const tracks = useMemo<Record<TrackId, Track>>(
    () => ({
      personal: {
        id: 'personal',
        label: 'Personal Goal',
        eyebrow: 'Your Record',
        current: 184500,
        goal: personalGoal,
        description: 'Your annual production target and personal best progression.',
        accent: 'text-amber-600',
      },
      agency: {
        id: 'agency',
        label: 'Agency Hall Of Fame',
        eyebrow: 'Family First Life',
        current: Number(issuePaid?.agency_green) || 0,
        goal: 10000000,
        description: 'Build a qualifying agency and earn the green jacket.',
        accent: 'text-emerald-600',
      },
      'hall-of-fame': {
        id: 'hall-of-fame',
        label: 'Personal Hall Of Fame',
        eyebrow: 'Family First Life',
        current: Number(issuePaid?.hall_of_fame_red) || 0,
        goal: 400000,
        description: 'Reach elite personal production and earn the red jacket.',
        accent: 'text-red-600',
      },
    }),
    [issuePaid, personalGoal],
  );

  const visibleTracks = view === 'agency'
    ? [tracks.agency]
    : [tracks['hall-of-fame']];

  useEffect(() => {
    if (view === 'agency' && activeTrack !== 'agency') setActiveTrack('agency');
    if (view === 'agent' && activeTrack === 'agency') setActiveTrack('hall-of-fame');
  }, [activeTrack, view]);

  const track = tracks[activeTrack];
  const completionPercent = Math.max(0, (track.current / Math.max(track.goal, 1)) * 100);
  const progress = Math.min(100, completionPercent);
  const remaining = Math.max(0, track.goal - track.current);
  const isLiveFflTrack = activeTrack === 'agency' || activeTrack === 'hall-of-fame';
  const issuePaidMetrics = useMemo(() => [
    { label: 'Whole Life', value: compactUsd.format(Number(issuePaid?.whole_life) || 0), exact: exactUsd.format(Number(issuePaid?.whole_life) || 0), Icon: ShieldCheck },
    { label: 'Term Life', value: compactUsd.format(Number(issuePaid?.term_life) || 0), exact: exactUsd.format(Number(issuePaid?.term_life) || 0), Icon: Timer },
    { label: 'Annuity', value: compactUsd.format(Number(issuePaid?.annuity) || 0), exact: exactUsd.format(Number(issuePaid?.annuity) || 0), Icon: Coins },
    { label: 'Universal Life', value: compactUsd.format(Number(issuePaid?.ul) || 0), exact: exactUsd.format(Number(issuePaid?.ul) || 0), Icon: Orbit },
    { label: 'Health', value: compactUsd.format(Number(issuePaid?.health) || 0), exact: exactUsd.format(Number(issuePaid?.health) || 0), Icon: HeartPulse },
    { label: 'Outside First Leg', value: compactUsd.format(Number(issuePaid?.outside_first_leg) || 0), exact: exactUsd.format(Number(issuePaid?.outside_first_leg) || 0), Icon: Users },
    { label: 'First Leg', value: `${Number(issuePaid?.first_leg_percent) || 0}%`, exact: `${Number(issuePaid?.first_leg_percent) || 0}%`, Icon: GitBranch },
  ], [issuePaid]);
  const theme = {
    personal: {
      surface: 'from-amber-50 via-white to-orange-50',
      activeTab: 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-lg shadow-amber-200/70',
      progress: 'bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 shadow-[0_0_18px_rgba(245,158,11,0.45)]',
      glow: 'bg-amber-300/30',
    },
    agency: {
      surface: 'from-emerald-50 via-white to-teal-50',
      activeTab: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/70',
      progress: 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 shadow-[0_0_18px_rgba(16,185,129,0.45)]',
      glow: 'bg-emerald-300/30',
    },
    'hall-of-fame': {
      surface: 'from-rose-50 via-white to-red-50',
      activeTab: 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-200/70',
      progress: 'bg-gradient-to-r from-rose-400 via-red-500 to-orange-500 shadow-[0_0_18px_rgba(244,63,94,0.45)]',
      glow: 'bg-rose-300/30',
    },
  }[activeTrack];
  const metricTones = [
    'border-violet-300 bg-gradient-to-br from-violet-100 via-white to-fuchsia-100 text-violet-700 shadow-violet-200/70',
    'border-cyan-300 bg-gradient-to-br from-cyan-100 via-white to-sky-100 text-cyan-700 shadow-cyan-200/70',
    'border-amber-300 bg-gradient-to-br from-amber-100 via-white to-yellow-100 text-amber-700 shadow-amber-200/70',
    'border-indigo-300 bg-gradient-to-br from-indigo-100 via-white to-blue-100 text-indigo-700 shadow-indigo-200/70',
    'border-rose-300 bg-gradient-to-br from-rose-100 via-white to-pink-100 text-rose-700 shadow-rose-200/70',
    'border-emerald-300 bg-gradient-to-br from-emerald-100 via-white to-teal-100 text-emerald-700 shadow-emerald-200/70',
    'border-orange-300 bg-gradient-to-br from-orange-100 via-white to-red-100 text-orange-700 shadow-orange-200/70',
  ];
  const checkpoints = [25, 50, 75, 100];
  const nextCheckpoint = checkpoints.find(checkpoint => checkpoint > progress) ?? 100;
  const nextMilestoneTarget = track.goal * (nextCheckpoint / 100);
  const dollarsToNextMilestone = Math.max(0, nextMilestoneTarget - track.current);
  const playerLevel = Math.min(10, Math.floor(progress / 10) + 1);
  const xp = Math.round(progress * 100);
  const achievementBadges = [
    { label: 'Rising Star', threshold: 25, Icon: Star },
    { label: 'Momentum', threshold: 50, Icon: Flame },
    { label: 'Elite', threshold: 75, Icon: Medal },
    { label: 'Legend', threshold: 100, Icon: Crown },
  ];

  const savePersonalGoal = () => {
    const parsed = Number(goalDraft.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) setPersonalGoal(parsed);
    setEditingGoal(false);
  };

  return (
    <section className={`relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br ${theme.surface} shadow-xl shadow-slate-200/50 dark:border-white/10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900`}>
      <div className={`pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl ${theme.glow}`} />
      <div className={`pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full blur-3xl ${theme.glow}`} />
      <div className="relative z-10 border-b border-white/70 px-5 py-5 backdrop-blur-sm dark:border-white/10 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600"><Sparkles className="h-3.5 w-3.5" /> Progress Center</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-slate-950">Race to HOF <Zap className="h-5 w-5 fill-amber-300 text-amber-500" /></h2>
            <p className="mt-1 text-sm text-slate-500">
              {view === 'agency'
                ? 'Track agency production and Family First Life milestones.'
                : 'Track personal production and Family First Life milestones.'}
            </p>
            {isLiveFflTrack && issuePaidError ? (
              <p className="mt-2 text-xs font-bold text-red-500">Unable to load live FFL data: {issuePaidError}</p>
            ) : isLiveFflTrack && issuePaid && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live FFL data{issuePaid.year ? ` · ${issuePaid.year}` : ''}</p>
            )}
          </div>
          {visibleTracks.length > 1 && (
          <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/80 bg-white/70 p-1.5 shadow-lg shadow-slate-200/50 backdrop-blur dark:border-white/10 dark:bg-white/5" role="tablist" aria-label="Achievement tracks">
            {visibleTracks.map((item) => {
              const Icon = item.id === 'personal' ? Target : item.id === 'agency' ? Building2 : Trophy;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTrack === item.id}
                  disabled={item.id === 'personal'}
                  onClick={() => setActiveTrack(item.id)}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all hover:-translate-y-0.5 ${
                    activeTrack === item.id
                      ? theme.activeTab
                      : item.id === 'personal'
                        ? 'cursor-not-allowed text-slate-400 opacity-75 hover:translate-y-0 dark:text-slate-500'
                        : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.id === 'personal' && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                      Coming Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          )}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-2 border-b border-white/70 bg-slate-950/90 px-5 py-3 text-white backdrop-blur md:grid-cols-4 sm:px-6 dark:border-white/10">
        <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20">{playerLevel}</span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/45">Player Level</p>
            <p className="text-xs font-black">Level {playerLevel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2">
          <Zap className="h-6 w-6 fill-cyan-300 text-cyan-300" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/45">Experience</p>
            <p className="text-xs font-black">{xp.toLocaleString()} XP</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2">
          {progress >= 100 ? <CheckCircle2 className="h-6 w-6 text-emerald-300" /> : <Target className="h-6 w-6 text-fuchsia-300" />}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/45">Current Quest</p>
            <p className="text-xs font-black">{progress >= 100 ? 'Goal conquered' : `Reach ${nextCheckpoint}%`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2">
          <Trophy className="h-6 w-6 text-amber-300" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/45">Next Unlock</p>
            <p className="text-xs font-black">{progress >= 100 ? 'Legend secured' : `${(nextCheckpoint - progress).toFixed(1)}% away`}</p>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${
        activeTrack === 'personal'
          ? 'min-h-[430px] lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]'
          : 'lg:grid-cols-[minmax(0,1fr)_360px]'
      }`}>
        <div className="relative flex flex-col justify-between bg-white/50 p-5 backdrop-blur-sm sm:p-6 lg:p-8 dark:bg-white/[0.02]">
          <Star className={`pointer-events-none absolute right-8 top-8 h-16 w-16 rotate-12 ${track.accent} opacity-[0.08]`} />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${track.accent}`}>{track.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{track.label}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{track.description}</p>
              </div>
              {activeTrack === 'personal' && (
                <button
                  type="button"
                  onClick={() => setEditingGoal((value) => !value)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:hover:bg-white/5 dark:hover:text-white"
                  title="Edit personal goal"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>

            {editingGoal && (
              <div className="mt-5 flex max-w-sm gap-2">
                <label className="sr-only" htmlFor="personal-production-goal">Personal production goal</label>
                <input
                  id="personal-production-goal"
                  value={goalDraft}
                  onChange={(event) => setGoalDraft(event.target.value)}
                  inputMode="decimal"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <button type="button" onClick={savePersonalGoal} className="h-10 rounded-lg bg-slate-950 px-4 text-xs font-bold text-white dark:bg-white dark:text-slate-950">Save</button>
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Current</p>
                <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  {isLiveFflTrack && issuePaidLoading
                    ? <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                    : isLiveFflTrack
                      ? exactUsd.format(track.current)
                      : compactUsd.format(track.current)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Goal</p>
                <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{compactUsd.format(track.goal)}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="text-3xl font-black text-slate-950 dark:text-white">{completionPercent.toFixed(1)}%</span>
                  <span className="ml-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">complete</span>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{usd.format(remaining)} remaining</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full border border-white bg-white/80 shadow-inner dark:border-white/10 dark:bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${theme.progress}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {checkpoints.map(milestone => {
                  const milestoneTarget = track.goal * (milestone / 100);
                  const dollarsNeeded = Math.max(0, milestoneTarget - track.current);
                  const reached = completionPercent >= milestone;
                  return (
                    <div key={milestone} className={`rounded-xl border px-3 py-2.5 transition-all ${reached ? `${theme.activeTab} shadow-md` : 'border-white/80 bg-white/70 text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-400'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black">{milestone}%</span>
                        <span className="text-[9px] font-black opacity-70">{compactUsd.format(milestoneTarget)} target</span>
                      </div>
                      <p className="mt-1 text-[10px] font-black">
                        {reached ? 'Reached' : `${usd.format(dollarsNeeded)} needed`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {isLiveFflTrack && issuePaid ? (
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Issue-paid breakdown</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {issuePaidMetrics.map((metric, index) => {
                    const MetricIcon = metric.Icon;
                    return (
                      <div key={metric.label} className={`group relative overflow-hidden rounded-2xl border p-3.5 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl dark:border-white/10 dark:bg-white/5 ${metricTones[index]}`}>
                        <div className="pointer-events-none absolute -right-5 -top-6 h-16 w-16 rounded-full bg-current opacity-[0.08] blur-xl transition-transform duration-300 group-hover:scale-150" />
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/75 shadow-sm ring-1 ring-current/10 dark:bg-white/10">
                            <MetricIcon className="h-4 w-4" />
                          </span>
                          <span className="rounded-full bg-white/65 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] opacity-70 dark:bg-white/10">Stat {String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <p className="relative mt-3 text-[9px] font-black uppercase tracking-[0.14em] opacity-75">{metric.label}</p>
                        <p className="relative mt-1 text-lg font-black dark:text-white">{metric.value}</p>
                        <p className="relative mt-1 truncate text-[9px] font-bold opacity-60" title={metric.exact}>{metric.exact}</p>
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-current opacity-70" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Badge Vault</p>
                <p className="text-[10px] font-black text-slate-400">{achievementBadges.filter(badge => progress >= badge.threshold).length}/4 unlocked</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {achievementBadges.map(({ label, threshold, Icon }) => {
                  const unlocked = progress >= threshold;
                  return (
                    <div key={label} className={`relative overflow-hidden rounded-xl border p-3 transition-all ${unlocked ? `${theme.activeTab} hover:-translate-y-1` : 'border-slate-200 bg-white/55 text-slate-400 grayscale dark:border-white/10 dark:bg-white/5'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${unlocked ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10'}`}>
                          {unlocked ? <Icon className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                        </span>
                        <span className="text-[9px] font-black opacity-70">{threshold}%</span>
                      </div>
                      <p className="mt-2 truncate text-[10px] font-black uppercase tracking-wide">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`group relative mt-8 flex items-center justify-between overflow-hidden rounded-2xl border border-white/40 p-4 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl ${theme.activeTab}`}>
            <div className="pointer-events-none absolute -right-5 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl transition-transform group-hover:scale-150" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner ring-1 ring-white/30"><Crown className="h-6 w-6" /></span>
              <div>
                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] opacity-70"><Sparkles className="h-3 w-3" /> Next milestone</p>
                <p className="mt-1 text-sm font-black">{progress >= 100 ? 'Legend status unlocked' : `Unlock the ${nextCheckpoint}% badge`}</p>
                <p className="mt-0.5 text-[10px] font-bold opacity-70">{progress >= 100 ? 'Final qualification review' : `${usd.format(dollarsToNextMilestone)} needed to reach this milestone`}</p>
              </div>
            </div>
            <div className="relative ml-3 flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ring-1 ring-white/25">
                {progress >= 100 ? 'Max rank' : `${Math.max(0, nextCheckpoint - progress).toFixed(1)}% to go`}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25"><ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </div>
          </div>
        </div>

        {activeTrack === 'personal' ? (
          <div className="relative min-h-80 overflow-hidden bg-slate-950 p-6 text-white lg:min-h-full lg:p-8">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:38px_38px]" />
            <div className="relative flex h-full min-h-72 flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Personal Record</p>
                  <p className="mt-2 text-2xl font-black">Production ascent</p>
                </div>
                <Target className="h-9 w-9 text-amber-300" />
              </div>
              <div className="space-y-5">
                {[25, 50, 75, 100].map((milestone) => (
                  <div key={milestone} className="flex items-center gap-4">
                    <span className={`flex h-9 w-12 items-center justify-center rounded-lg text-xs font-black ${progress >= milestone ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white/55'}`}>{milestone}%</span>
                    <div className="h-px flex-1 bg-white/15" />
                    <span className="w-24 text-right text-xs font-bold text-white/70">{compactUsd.format(track.goal * (milestone / 100))}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold text-white/50">Update your goal at any time. Progress uses mock production data for this preview.</p>
            </div>
          </div>
        ) : (
          <div className={`relative min-h-72 overflow-hidden lg:min-h-full ${activeTrack === 'agency' ? 'bg-[#071a14]' : 'bg-[#20090d]'}`}>
            <img
              src={activeTrack === 'agency' ? greenCoupleGif : redCoupleGif}
              alt={activeTrack === 'agency' ? 'Green jacket agency qualification' : 'Red jacket Hall of Fame qualification'}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${activeTrack === 'agency' ? 'text-emerald-300' : 'text-red-300'}`}>
                {activeTrack === 'agency' ? 'Agency Green' : 'Hall of Fame Red'}
              </p>
              <p className="mt-1 text-lg font-black">Qualification progress</p>
              <p className="mt-1 text-xs font-semibold text-white/65">Live issue-paid total for {issuePaid?.name || 'the selected agent'}.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
