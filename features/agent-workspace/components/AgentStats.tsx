import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  BarChart3, 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  Award, 
  Loader2, 
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  Star,
  Trophy,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAgentContext } from '../context/AgentContext';
import { agentStatsApi, PersonalStats } from '../services/agentStatsApi';
import { formatCurrencyCompact } from './overview/utils';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

export const AgentStats: React.FC = () => {
  const navigate = useNavigate();
  const { currentAgentId } = useAgentContext();
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentAgentId) {
      setLoading(true);
      agentStatsApi.getPersonalStats(currentAgentId)
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [currentAgentId]);

  if (loading) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin text-brand-500 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest">Loading Personal Vault...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm transition-all"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* TOP ROW STATS */}
        <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-brand-50 rounded-2xl text-brand-500">
                <Trophy className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Production</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrencyCompact(stats.total_premium)}</h3>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Submissions</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.total_submissions}</h3>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500">
                <Target className="w-6 h-6" />
              </div>
              <div className="text-[10px] font-black text-emerald-600">82% Rank</div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Placement Ratio</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.placement_ratio}%</h3>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-500">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Premium</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrencyCompact(stats.average_premium)}</h3>
          </div>
        </div>

        {/* TREND CHART */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Production Trend</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Premium Flow</p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                   <span className="text-[10px] font-black text-slate-600">Premium</span>
                </div>
              </div>
            </div>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthly_trend}>
                  <defs>
                    <linearGradient id="colorPrem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="premium" 
                    stroke="#f59e0b" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorPrem)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* SIDEBAR: MILESTONES & CARRIERS */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Carrier Mix</h3>
            <div className="h-[240px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.carrier_distribution}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    cornerRadius={12}
                    stroke="none"
                  >
                    {stats.carrier_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <PieIcon className="w-5 h-5 text-slate-300 mb-1" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Mix</span>
              </div>
            </div>
            <div className="mt-8 space-y-4">
              {stats.carrier_distribution.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-xs font-bold text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{Math.round((item.value / stats.total_premium) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="text-xl font-black tracking-tight mb-8 relative z-10">Recent Milestones</h3>
            <div className="space-y-6 relative z-10">
              {stats.recent_milestones.map(m => (
                <div key={m.id} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {m.icon === 'trophy' ? <Trophy className="w-5 h-5 text-brand-500" /> : 
                     m.icon === 'shield' ? <ShieldCheck className="w-5 h-5 text-blue-400" /> : 
                     <Star className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-black">{m.title}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(m.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
              Claim Rewards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
