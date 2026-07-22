import React, { FormEvent, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  Handshake,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Users,
  X,
} from 'lucide-react';

type ServiceTab = 'leads' | 'training' | 'assist' | 'staff';

type LeadVendor = {
  id: string;
  name: string;
  initials: string;
  accent: string;
  description: string;
  leadTypes: string[];
  states: string;
  price: string;
  minimum: number;
  contactRate: number;
  closeRate: number;
  delivery: string;
  products: Array<{ name: string; price: string; availability: string }>;
};

type Trainer = {
  id: string;
  name: string;
  title: string;
  image: string;
  specialties: string[];
  format: string;
  rating: number;
  sessions: number;
  price: string;
  availability: string;
  nextSession: string;
};

type AssistAgent = {
  id: string;
  name: string;
  agency: string;
  image: string;
  specialties: string[];
  states: string[];
  capacity: string;
  availability: string;
  experience: string;
};

type StaffMember = {
  id: string;
  name: string;
  role: string;
  image: string;
  skills: string[];
  rate: string;
  availability: string;
  experience: string;
  engagement: string;
  timezone: string;
};

const leadVendors: LeadVendor[] = [
  {
    id: 'signal-leads',
    name: 'Signal Leads Co.',
    initials: 'SL',
    accent: 'bg-emerald-500',
    description: 'Exclusive final expense leads delivered in real time with verified contact data.',
    leadTypes: ['Final Expense', 'Exclusive'],
    states: '42 states',
    price: '$28 - $42',
    minimum: 20,
    contactRate: 64,
    closeRate: 13.8,
    delivery: 'Real-time CRM delivery',
    products: [
      { name: 'Exclusive Final Expense', price: '$42 / lead', availability: 'Available' },
      { name: 'Aged Final Expense 30-60', price: '$18 / lead', availability: 'Available' },
      { name: 'Spanish Final Expense', price: '$36 / lead', availability: 'Limited' },
    ],
  },
  {
    id: 'northstar',
    name: 'Northstar Media',
    initials: 'NM',
    accent: 'bg-amber-500',
    description: 'Inbound calls and scheduled appointments for life and mortgage protection agents.',
    leadTypes: ['Inbound Calls', 'Mortgage Protection'],
    states: 'Nationwide',
    price: '$55 - $95',
    minimum: 10,
    contactRate: 92,
    closeRate: 18.4,
    delivery: 'Live transfer',
    products: [
      { name: 'Final Expense Live Transfer', price: '$75 / call', availability: 'Available' },
      { name: 'Mortgage Protection Appointment', price: '$95 / appt', availability: 'Available' },
      { name: 'Life Inbound Call', price: '$55 / call', availability: 'Waitlist' },
    ],
  },
  {
    id: 'policy-path',
    name: 'PolicyPath Direct',
    initials: 'PD',
    accent: 'bg-blue-500',
    description: 'Cost-efficient aged and shared leads for agents building consistent dialing volume.',
    leadTypes: ['Aged Leads', 'Shared'],
    states: '38 states',
    price: '$4 - $16',
    minimum: 50,
    contactRate: 41,
    closeRate: 7.2,
    delivery: 'Daily batch',
    products: [
      { name: 'Aged 7-14 Day', price: '$16 / lead', availability: 'Available' },
      { name: 'Aged 30-90 Day', price: '$8 / lead', availability: 'Available' },
      { name: 'Shared Web Lead', price: '$4 / lead', availability: 'Available' },
    ],
  },
  {
    id: 'summit-intent',
    name: 'Summit Intent',
    initials: 'SI',
    accent: 'bg-violet-500',
    description: 'High-intent social leads with compliant creative and transparent attribution.',
    leadTypes: ['Social', 'IUL'],
    states: '31 states',
    price: '$32 - $58',
    minimum: 25,
    contactRate: 58,
    closeRate: 11.6,
    delivery: 'Real-time webhook',
    products: [
      { name: 'IUL High Intent', price: '$58 / lead', availability: 'Limited' },
      { name: 'Life Social Exclusive', price: '$38 / lead', availability: 'Available' },
      { name: 'Bilingual Social', price: '$32 / lead', availability: 'Available' },
    ],
  },
];

const trainers: Trainer[] = [
  {
    id: 'maya-reed',
    name: 'Maya Reed',
    title: 'Final Expense Sales Coach',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=85',
    specialties: ['Phone Sales', 'Objection Handling', 'Final Expense'],
    format: '1:1 and team workshops',
    rating: 4.9,
    sessions: 184,
    price: 'From $175',
    availability: 'Available this week',
    nextSession: 'Tue, 2:00 PM MT',
  },
  {
    id: 'marcus-hill',
    name: 'Marcus Hill',
    title: 'Agency Growth Strategist',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=85',
    specialties: ['Recruiting', 'Leadership', 'Accountability'],
    format: 'Team workshops',
    rating: 4.8,
    sessions: 121,
    price: 'From $250',
    availability: '3 openings',
    nextSession: 'Wed, 11:00 AM MT',
  },
  {
    id: 'elena-torres',
    name: 'Elena Torres',
    title: 'IUL Product Specialist',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=85',
    specialties: ['IUL', 'Case Design', 'Advanced Markets'],
    format: '1:1 virtual sessions',
    rating: 5,
    sessions: 96,
    price: 'From $200',
    availability: 'Available next week',
    nextSession: 'Mon, 9:30 AM MT',
  },
  {
    id: 'david-chen',
    name: 'David Chen',
    title: 'Lead Conversion Trainer',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=85',
    specialties: ['Lead Follow-up', 'CRM Workflow', 'Live Transfers'],
    format: 'Small groups',
    rating: 4.7,
    sessions: 143,
    price: 'From $150',
    availability: 'Available this week',
    nextSession: 'Thu, 4:00 PM MT',
  },
];

const assistAgents: AssistAgent[] = [
  {
    id: 'jordan-blake',
    name: 'Jordan Blake',
    agency: 'Radiant Financial',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=85',
    specialties: ['Closing', 'Final Expense', 'Live Transfers'],
    states: ['TX', 'FL', 'GA', 'OH'],
    capacity: 'Up to 12 appointments/week',
    availability: 'Available now',
    experience: '6 years licensed',
  },
  {
    id: 'nina-patel',
    name: 'Nina Patel',
    agency: 'Summit Legacy Group',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=85',
    specialties: ['Case Management', 'Policy Follow-up', 'Underwriting'],
    states: ['CA', 'AZ', 'NV'],
    capacity: 'Up to 20 cases/week',
    availability: '2 openings',
    experience: '4 years licensed',
  },
  {
    id: 'andre-williams',
    name: 'Andre Williams',
    agency: 'Clearview Financial',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=85',
    specialties: ['Appointment Setting', 'Dialing', 'New Agent Mentoring'],
    states: ['MO', 'IL', 'IN', 'KS'],
    capacity: '15 hours/week',
    availability: 'Available Monday',
    experience: '5 years licensed',
  },
  {
    id: 'sophia-martinez',
    name: 'Sophia Martinez',
    agency: 'Legacy Partners',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=85',
    specialties: ['Spanish Sales', 'IUL', 'Closing'],
    states: ['TX', 'NM', 'CO', 'AZ'],
    capacity: 'Up to 8 appointments/week',
    availability: 'Available now',
    experience: '7 years licensed',
  },
];

const staffMembers: StaffMember[] = [
  {
    id: 'olivia-bennett',
    name: 'Olivia Bennett',
    role: 'Project Operations Coordinator',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=85',
    skills: ['Project Tracking', 'SOPs', 'Vendor Coordination'],
    rate: '$32 / hour',
    availability: 'Available now',
    experience: '6 years operations',
    engagement: '20-40 hours/week',
    timezone: 'Mountain Time',
  },
  {
    id: 'ethan-wright',
    name: 'Ethan Wright',
    role: 'CRM Implementation Specialist',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=85',
    skills: ['CRM Setup', 'Automation', 'Data Migration'],
    rate: 'From $1,800 / project',
    availability: 'Starts in 1 week',
    experience: '42 projects completed',
    engagement: 'Project based',
    timezone: 'Central Time',
  },
  {
    id: 'camila-rodriguez',
    name: 'Camila Rodriguez',
    role: 'Bilingual Recruiting Coordinator',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=85',
    skills: ['Candidate Screening', 'Onboarding', 'English / Spanish'],
    rate: '$28 / hour',
    availability: '2 openings',
    experience: '5 years recruiting',
    engagement: '15-30 hours/week',
    timezone: 'Eastern Time',
  },
  {
    id: 'noah-kim',
    name: 'Noah Kim',
    role: 'Reporting & Data Analyst',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=85',
    skills: ['Dashboards', 'Data Cleanup', 'Performance Reporting'],
    rate: '$45 / hour',
    availability: 'Available Monday',
    experience: '7 years analytics',
    engagement: '10-25 hours/week',
    timezone: 'Pacific Time',
  },
];

const tabMeta = {
  leads: {
    label: 'Lead Market',
    description: 'Compare approved lead partners and place an order.',
    icon: ShoppingBag,
    search: 'Search vendors or lead types...',
  },
  training: {
    label: 'Training Services',
    description: 'Find coaches for individual and team development.',
    icon: GraduationCap,
    search: 'Search trainers or specialties...',
  },
  assist: {
    label: 'Agent Assist',
    description: 'Connect with licensed agents available to support your business.',
    icon: Handshake,
    search: 'Search agents or assistance types...',
  },
  staff: {
    label: 'Staff Services',
    description: 'Hire direct staff for defined projects and operational work.',
    icon: BriefcaseBusiness,
    search: 'Search staff roles or project skills...',
  },
} as const;

const Metric = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="min-w-0 border-r border-slate-100 px-4 last:border-r-0">
    <div className="flex items-center gap-2 text-slate-400">
      {icon}
      <p className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</p>
    </div>
    <p className="mt-2 truncate text-lg font-black text-slate-950">{value}</p>
  </div>
);

const ServicesMarketplace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ServiceTab>('leads');
  const [search, setSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(leadVendors[0].id);
  const [selectedTrainerId, setSelectedTrainerId] = useState(trainers[0].id);
  const [selectedAssistId, setSelectedAssistId] = useState(assistAgents[0].id);
  const [selectedStaffId, setSelectedStaffId] = useState(staffMembers[0].id);
  const [requestOpen, setRequestOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const selectedLead = leadVendors.find(item => item.id === selectedLeadId) || leadVendors[0];
  const selectedTrainer = trainers.find(item => item.id === selectedTrainerId) || trainers[0];
  const selectedAssist = assistAgents.find(item => item.id === selectedAssistId) || assistAgents[0];
  const selectedStaff = staffMembers.find(item => item.id === selectedStaffId) || staffMembers[0];
  const activeMeta = tabMeta[activeTab];

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leadVendors.filter(item => !query || `${item.name} ${item.description} ${item.leadTypes.join(' ')}`.toLowerCase().includes(query));
  }, [search]);

  const filteredTrainers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return trainers.filter(item => !query || `${item.name} ${item.title} ${item.specialties.join(' ')}`.toLowerCase().includes(query));
  }, [search]);

  const filteredAssist = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assistAgents.filter(item => !query || `${item.name} ${item.agency} ${item.specialties.join(' ')}`.toLowerCase().includes(query));
  }, [search]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staffMembers.filter(item => !query || `${item.name} ${item.role} ${item.skills.join(' ')}`.toLowerCase().includes(query));
  }, [search]);

  const openRequest = () => {
    setSuccessMessage('');
    setRequestOpen(true);
  };

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = activeTab === 'leads' ? selectedLead.name : activeTab === 'training' ? selectedTrainer.name : activeTab === 'assist' ? selectedAssist.name : selectedStaff.name;
    setRequestOpen(false);
    setSuccessMessage(`Mock request submitted to ${subject}.`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex justify-end">
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
          <Sparkles className="h-4 w-4" />
          Mock marketplace data
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-3">
          <div className="grid grid-cols-1 gap-2 rounded-2xl bg-slate-50 p-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(tabMeta) as ServiceTab[]).map(key => {
              const item = tabMeta[key];
              const Icon = item.icon;
              const active = key === activeTab;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveTab(key);
                    setSearch('');
                    setSuccessMessage('');
                  }}
                  className={`flex min-h-14 items-center gap-3 rounded-xl px-4 text-left transition-all ${active ? 'bg-slate-950 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-white hover:text-slate-950'}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-black">{item.label}</span>
                    <span className={`hidden truncate text-[10px] font-semibold lg:block ${active ? 'text-white/55' : 'text-slate-400'}`}>{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{activeMeta.label}</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{activeMeta.description}</h2>
          </div>
          <label className="relative block w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={activeMeta.search}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
            />
          </label>
        </div>

        {successMessage && (
          <div className="mx-5 mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
            <Check className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
            <div className="grid grid-cols-1 gap-4 border-b border-slate-100 p-5 md:grid-cols-2 lg:border-b-0 lg:border-r">
              {filteredLeads.map(vendor => {
                const selected = selectedLead.id === vendor.id;
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => setSelectedLeadId(vendor.id)}
                    className={`flex min-h-64 flex-col border p-5 text-left transition-all ${selected ? 'border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-200' : 'border-slate-100 bg-white text-slate-950 hover:border-amber-200 hover:shadow-lg'}`}
                    style={{ borderRadius: 8 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white ${vendor.accent}`}>{vendor.initials}</div>
                      <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${selected ? 'bg-white/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>Accepting orders</span>
                    </div>
                    <h3 className="mt-5 text-lg font-black">{vendor.name}</h3>
                    <p className={`mt-2 line-clamp-2 text-xs font-semibold leading-5 ${selected ? 'text-white/55' : 'text-slate-500'}`}>{vendor.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {vendor.leadTypes.map(type => <span key={type} className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${selected ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-500'}`}>{type}</span>)}
                    </div>
                    <div className={`mt-auto grid grid-cols-2 gap-4 border-t pt-4 ${selected ? 'border-white/10' : 'border-slate-100'}`}>
                      <div><p className={`text-[9px] font-black uppercase ${selected ? 'text-white/35' : 'text-slate-400'}`}>Price</p><p className="mt-1 text-sm font-black">{vendor.price}</p></div>
                      <div><p className={`text-[9px] font-black uppercase ${selected ? 'text-white/35' : 'text-slate-400'}`}>Coverage</p><p className="mt-1 text-sm font-black">{vendor.states}</p></div>
                    </div>
                  </button>
                );
              })}
            </div>

            <aside className="p-5 lg:sticky lg:top-28 lg:self-start">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Selected Vendor</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">{selectedLead.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{selectedLead.delivery}</p>
                </div>
                <BadgeCheck className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50 py-4">
                <Metric label="Contact rate" value={`${selectedLead.contactRate}%`} icon={<Target className="h-3.5 w-3.5" />} />
                <Metric label="Close rate" value={`${selectedLead.closeRate}%`} icon={<BarChart3 className="h-3.5 w-3.5" />} />
              </div>
              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Available products</p>
                <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
                  {selectedLead.products.map(product => (
                    <div key={product.name} className="flex items-center justify-between gap-3 py-3">
                      <div><p className="text-sm font-black text-slate-950">{product.name}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{product.availability}</p></div>
                      <p className="shrink-0 text-xs font-black text-slate-700">{product.price}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
                <span className="text-xs font-bold text-amber-800">Minimum order</span>
                <span className="text-sm font-black text-amber-900">{selectedLead.minimum} leads</span>
              </div>
              <button onClick={openRequest} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 text-sm font-black text-slate-950 shadow-lg shadow-amber-200 transition hover:bg-amber-300">
                <ShoppingBag className="h-4 w-4" /> Start Order <ArrowRight className="h-4 w-4" />
              </button>
            </aside>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
            <div className="grid grid-cols-1 gap-4 border-b border-slate-100 p-5 md:grid-cols-2 lg:border-b-0 lg:border-r">
              {filteredTrainers.map(trainer => {
                const selected = selectedTrainer.id === trainer.id;
                return (
                  <button key={trainer.id} onClick={() => setSelectedTrainerId(trainer.id)} className={`min-h-72 border p-5 text-left transition-all ${selected ? 'border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-200' : 'border-slate-100 bg-white text-slate-950 hover:border-amber-200 hover:shadow-lg'}`} style={{ borderRadius: 8 }}>
                    <div className="flex items-start gap-4">
                      <img src={trainer.image} alt={trainer.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                      <div className="min-w-0"><h3 className="truncate text-lg font-black">{trainer.name}</h3><p className={`mt-1 text-xs font-bold ${selected ? 'text-white/55' : 'text-slate-500'}`}>{trainer.title}</p><div className="mt-2 flex items-center gap-1 text-xs font-black text-amber-400"><Star className="h-3.5 w-3.5 fill-current" /> {trainer.rating} <span className={selected ? 'text-white/35' : 'text-slate-400'}>({trainer.sessions})</span></div></div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">{trainer.specialties.map(item => <span key={item} className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${selected ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-500'}`}>{item}</span>)}</div>
                    <div className={`mt-5 space-y-3 border-t pt-4 text-xs font-bold ${selected ? 'border-white/10 text-white/60' : 'border-slate-100 text-slate-500'}`}>
                      <p className="flex items-center gap-2"><Users className="h-4 w-4" /> {trainer.format}</p>
                      <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {trainer.availability}</p>
                    </div>
                    <p className={`mt-4 text-sm font-black ${selected ? 'text-amber-300' : 'text-slate-950'}`}>{trainer.price}</p>
                  </button>
                );
              })}
            </div>
            <aside className="p-5 lg:sticky lg:top-28 lg:self-start">
              <div className="flex items-center gap-4"><img src={selectedTrainer.image} alt={selectedTrainer.name} className="h-20 w-20 rounded-2xl object-cover" /><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trainer Profile</p><h3 className="mt-1 text-2xl font-black text-slate-950">{selectedTrainer.name}</h3><p className="text-xs font-bold text-slate-500">{selectedTrainer.title}</p></div></div>
              <div className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50 py-4"><Metric label="Rating" value={`${selectedTrainer.rating} / 5`} icon={<Star className="h-3.5 w-3.5" />} /><Metric label="Sessions" value={selectedTrainer.sessions.toString()} icon={<BookOpen className="h-3.5 w-3.5" />} /></div>
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Next opening</p><p className="mt-2 flex items-center gap-2 text-sm font-black text-emerald-950"><Clock3 className="h-4 w-4" /> {selectedTrainer.nextSession}</p></div>
              <div className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Best for</p><div className="mt-3 space-y-2">{selectedTrainer.specialties.map(item => <p key={item} className="flex items-center gap-2 text-sm font-bold text-slate-600"><Check className="h-4 w-4 text-emerald-500" /> {item}</p>)}</div></div>
              <button onClick={openRequest} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 text-sm font-black text-slate-950 shadow-lg shadow-amber-200 transition hover:bg-amber-300"><CalendarDays className="h-4 w-4" /> Request Session</button>
            </aside>
          </div>
        )}

        {activeTab === 'assist' && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
            <div className="grid grid-cols-1 gap-4 border-b border-slate-100 p-5 md:grid-cols-2 lg:border-b-0 lg:border-r">
              {filteredAssist.map(agent => {
                const selected = selectedAssist.id === agent.id;
                return (
                  <button key={agent.id} onClick={() => setSelectedAssistId(agent.id)} className={`min-h-72 border p-5 text-left transition-all ${selected ? 'border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-200' : 'border-slate-100 bg-white text-slate-950 hover:border-amber-200 hover:shadow-lg'}`} style={{ borderRadius: 8 }}>
                    <div className="flex items-start gap-4"><img src={agent.image} alt={agent.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" /><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-lg font-black">{agent.name}</h3><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /></div><p className={`mt-1 text-xs font-bold ${selected ? 'text-white/55' : 'text-slate-500'}`}>{agent.agency}</p><p className="mt-2 text-[10px] font-black uppercase text-emerald-400">{agent.availability}</p></div></div>
                    <div className="mt-5 flex flex-wrap gap-2">{agent.specialties.map(item => <span key={item} className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${selected ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-500'}`}>{item}</span>)}</div>
                    <div className={`mt-5 space-y-3 border-t pt-4 text-xs font-bold ${selected ? 'border-white/10 text-white/60' : 'border-slate-100 text-slate-500'}`}><p className="flex items-center gap-2"><PackageCheck className="h-4 w-4" /> {agent.capacity}</p><p className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" /> {agent.experience}</p></div>
                    <div className="mt-4 flex gap-2">{agent.states.map(state => <span key={state} className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black ${selected ? 'bg-white/10 text-white' : 'bg-amber-50 text-amber-700'}`}>{state}</span>)}</div>
                  </button>
                );
              })}
            </div>
            <aside className="p-5 lg:sticky lg:top-28 lg:self-start">
              <div className="flex items-center gap-4"><img src={selectedAssist.image} alt={selectedAssist.name} className="h-20 w-20 rounded-2xl object-cover" /><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Available Agent</p><h3 className="mt-1 text-2xl font-black text-slate-950">{selectedAssist.name}</h3><p className="text-xs font-bold text-slate-500">{selectedAssist.agency}</p></div></div>
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Availability</p><p className="mt-2 text-sm font-black text-emerald-950">{selectedAssist.availability}</p></div><div className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /></div></div>
              <div className="mt-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Capacity</p><p className="mt-2 text-sm font-black text-slate-950">{selectedAssist.capacity}</p></div><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Licensed coverage</p><p className="mt-2 flex items-center gap-2 text-sm font-black text-slate-950"><MapPin className="h-4 w-4 text-amber-500" /> {selectedAssist.states.join(', ')}</p></div></div>
              <div className="mt-5 border-t border-slate-100 pt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Assistance offered</p><div className="mt-3 space-y-2">{selectedAssist.specialties.map(item => <p key={item} className="flex items-center gap-2 text-sm font-bold text-slate-600"><Check className="h-4 w-4 text-emerald-500" /> {item}</p>)}</div></div>
              <button onClick={openRequest} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 text-sm font-black text-slate-950 shadow-lg shadow-amber-200 transition hover:bg-amber-300"><Handshake className="h-4 w-4" /> Request Assistance</button>
            </aside>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
            <div className="grid grid-cols-1 gap-4 border-b border-slate-100 p-5 md:grid-cols-2 lg:border-b-0 lg:border-r">
              {filteredStaff.map(staff => {
                const selected = selectedStaff.id === staff.id;
                return (
                  <button key={staff.id} onClick={() => setSelectedStaffId(staff.id)} className={`min-h-72 border p-5 text-left transition-all ${selected ? 'border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-200' : 'border-slate-100 bg-white text-slate-950 hover:border-amber-200 hover:shadow-lg'}`} style={{ borderRadius: 8 }}>
                    <div className="flex items-start gap-4">
                      <img src={staff.image} alt={staff.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black">{staff.name}</h3>
                        <p className={`mt-1 text-xs font-bold ${selected ? 'text-white/55' : 'text-slate-500'}`}>{staff.role}</p>
                        <p className="mt-2 text-[10px] font-black uppercase text-emerald-400">{staff.availability}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">{staff.skills.map(skill => <span key={skill} className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${selected ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-500'}`}>{skill}</span>)}</div>
                    <div className={`mt-5 space-y-3 border-t pt-4 text-xs font-bold ${selected ? 'border-white/10 text-white/60' : 'border-slate-100 text-slate-500'}`}>
                      <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {staff.engagement}</p>
                      <p className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" /> {staff.experience}</p>
                    </div>
                    <p className={`mt-4 text-sm font-black ${selected ? 'text-amber-300' : 'text-slate-950'}`}>{staff.rate}</p>
                  </button>
                );
              })}
            </div>
            <aside className="p-5 lg:sticky lg:top-28 lg:self-start">
              <div className="flex items-center gap-4"><img src={selectedStaff.image} alt={selectedStaff.name} className="h-20 w-20 rounded-2xl object-cover" /><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Project Staff</p><h3 className="mt-1 text-2xl font-black text-slate-950">{selectedStaff.name}</h3><p className="text-xs font-bold text-slate-500">{selectedStaff.role}</p></div></div>
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Availability</p><p className="mt-2 text-sm font-black text-emerald-950">{selectedStaff.availability}</p></div><div className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /></div></div>
              <div className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50 py-4"><Metric label="Engagement" value={selectedStaff.engagement} icon={<CalendarDays className="h-3.5 w-3.5" />} /><Metric label="Rate" value={selectedStaff.rate} icon={<CircleDollarSign className="h-3.5 w-3.5" />} /></div>
              <div className="mt-5 space-y-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Working timezone</p><p className="mt-2 text-sm font-black text-slate-950">{selectedStaff.timezone}</p></div><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Project skills</p><div className="mt-3 space-y-2">{selectedStaff.skills.map(skill => <p key={skill} className="flex items-center gap-2 text-sm font-bold text-slate-600"><Check className="h-4 w-4 text-emerald-500" /> {skill}</p>)}</div></div></div>
              <button onClick={openRequest} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 text-sm font-black text-slate-950 shadow-lg shadow-amber-200 transition hover:bg-amber-300"><BriefcaseBusiness className="h-4 w-4" /> Hire for Project</button>
            </aside>
          </div>
        )}
      </section>

      {requestOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={() => setRequestOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-start justify-between bg-slate-950 p-6 text-white">
              <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Mock request</p><h2 className="mt-1 text-2xl font-black">{activeTab === 'leads' ? 'Start lead order' : activeTab === 'training' ? 'Request training' : activeTab === 'assist' ? 'Request agent assistance' : 'Hire project staff'}</h2></div>
              <button onClick={() => setRequestOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20" title="Close"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submitRequest} className="space-y-4 p-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Selected service</p><p className="mt-2 text-base font-black text-slate-950">{activeTab === 'leads' ? selectedLead.name : activeTab === 'training' ? selectedTrainer.name : activeTab === 'assist' ? selectedAssist.name : selectedStaff.name}</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{activeTab === 'leads' ? 'Quantity' : 'Preferred date'}</span><input required type={activeTab === 'leads' ? 'number' : 'date'} min={activeTab === 'leads' ? 1 : undefined} defaultValue={activeTab === 'leads' ? selectedLead.minimum : undefined} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" /></label>
                <label><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Assigned to</span><select className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"><option>My Workspace</option><option>Selected agent</option><option>My team</option></select></label>
              </div>
              <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Notes</span><textarea rows={3} placeholder="Add goals, states, timing, or other requirements..." className="mt-2 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-bold outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" /></label>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setRequestOpen(false)} className="h-12 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 text-sm font-black text-slate-950 shadow-lg shadow-amber-200 hover:bg-amber-300"><CircleDollarSign className="h-4 w-4" /> Submit Mock Request</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const ServicesPage: React.FC = () => (
  <div className="space-y-5 animate-in fade-in duration-300">
    <section className="flex min-h-[36rem] items-center justify-center overflow-hidden rounded-[2rem] border border-white/80 bg-white px-6 py-12 shadow-sm">
      <div className="w-full max-w-4xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
          <BriefcaseBusiness className="h-7 w-7" />
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Coming Soon</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">Services are currently unavailable.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">
          The PolicyHQ service marketplace is being prepared and will be available in a future update.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-slate-100 bg-slate-50 p-4" style={{ borderRadius: 8 }}>
            <ShoppingBag className="h-5 w-5 text-amber-600" />
            <h3 className="mt-3 text-sm font-black text-slate-950">Lead Market</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Compare lead vendors, review performance, and place lead orders.</p>
          </div>
          <div className="border border-slate-100 bg-slate-50 p-4" style={{ borderRadius: 8 }}>
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <h3 className="mt-3 text-sm font-black text-slate-950">Training Services</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Find trainers for sales, products, leadership, and agency growth.</p>
          </div>
          <div className="border border-slate-100 bg-slate-50 p-4" style={{ borderRadius: 8 }}>
            <Handshake className="h-5 w-5 text-emerald-600" />
            <h3 className="mt-3 text-sm font-black text-slate-950">Agent Assist</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Connect with licensed agents available for hands-on assistance.</p>
          </div>
          <div className="border border-slate-100 bg-slate-50 p-4" style={{ borderRadius: 8 }}>
            <BriefcaseBusiness className="h-5 w-5 text-violet-600" />
            <h3 className="mt-3 text-sm font-black text-slate-950">Staff Services</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Hire direct project staff for operational and specialized work.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default ServicesPage;
