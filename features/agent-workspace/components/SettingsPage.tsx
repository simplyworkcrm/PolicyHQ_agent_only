import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, Briefcase, Check, ChevronDown, ImagePlus, Mail, Phone, Search, Settings, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

type SettingsTab = 'user' | 'agent';
type AgencyOption = {
  id: string;
  name: string;
  logo?: { url?: string } | string | null;
};
type UplineOption = {
  id?: string;
  agent_id?: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  agent_name?: string;
  npn?: string | number;
  agent_npn?: string | number;
};
type AgentProfileResponse = Record<string, any>;

const API_V2_BASE_URL = 'https://api1.simplyworkcrm.com/api:SZgR1JsR';

const unwrapApiPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) return payload[0] || {};
  return payload.agent_profile || payload.agentProfile || payload.item || payload.data || payload;
};

const getImageUrl = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.url || value.src || value.path || '';
};

const getNestedId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return String(value.id || value.agent_id || value.value || '');
};

const getFilenameFromUrl = (url: string) => {
  const path = url.split('?')[0].split('/').pop() || 'agent-profile-image';
  return decodeURIComponent(path.replace(/\+/g, ' '));
};

const getFileFromUrl = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load existing profile image.');
  const blob = await response.blob();
  return new File([blob], getFilenameFromUrl(url), { type: blob.type || 'image/png' });
};

const mapAgentProfile = (payload: AgentProfileResponse) => {
  const profile = unwrapApiPayload(payload) || {};
  const agency = profile.agency || profile.agency_data || profile.agency_detail;
  const upline = profile.upline || profile.upline_agent || profile.upline_data;

  return {
    id: profile.id || profile.agent_id || '',
    firstName: profile.first_name || profile.firstName || '',
    lastName: profile.last_name || profile.lastName || '',
    phone: profile.phone || profile.work_phone || profile.business_phone || '',
    email: profile.email || profile.work_email || profile.business_email || '',
    npn: profile.npn || profile.agent_npn || profile.national_producer_number || '',
    agencyId: String(profile.ref_ffl_agency || profile.agency_id || profile.agencyId || getNestedId(agency)),
    agencyName: profile.ref_ffl_agency_name || agency?.name || '',
    uplineId: String(
      profile.ref_agent_upline ||
      profile.upline_id ||
      profile.uplineId ||
      profile.upline_agent_id ||
      profile.uplineAgentId ||
      getNestedId(upline)
    ),
    uplineName: profile.ref_agent_upline_name || upline?.name || upline?.agent_name || '',
    imageUrl: getImageUrl(
      profile.profile_image ||
      profile.profileImage ||
      profile.profile ||
      profile.image ||
      profile.profile_photo ||
      profile.profilePhoto ||
      profile.avatar ||
      profile.avatar_url ||
      profile.image_url
    ),
  };
};

const FieldRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
    <p className="text-sm font-bold text-slate-900 truncate">{value || 'Not set'}</p>
  </div>
);

type DropdownOption = {
  id: string;
  label: string;
  sub?: string;
  imageUrl?: string;
};

const AppDropdown = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
  loading,
  searchable,
  searchTerm,
  onSearchChange,
}: {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div className="space-y-2" ref={ref}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((open) => !open)}
          className={`w-full min-h-[46px] px-4 py-3 rounded-2xl border text-sm font-bold transition-all flex items-center justify-between gap-3 ${
            isOpen
              ? 'bg-white border-brand-300 ring-2 ring-brand-500/20 shadow-lg shadow-slate-200/50'
              : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200'
          } ${disabled ? 'opacity-60 cursor-not-allowed hover:bg-slate-50' : 'cursor-pointer'}`}
        >
          <span className="min-w-0 flex items-center gap-2 text-left">
            {selected?.imageUrl && (
              <img src={selected.imageUrl} alt="" className="w-6 h-6 rounded-lg object-cover border border-slate-100 shrink-0" />
            )}
            <span className="min-w-0">
              <span className={`block truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
                {loading ? 'Loading...' : selected?.label || placeholder}
              </span>
              {selected?.sub && <span className="block text-[10px] text-slate-400 font-semibold truncate mt-0.5">{selected.sub}</span>}
            </span>
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-300/40 border border-slate-100 z-[80] p-2 animate-in fade-in zoom-in-95 duration-150 origin-top max-h-80 overflow-hidden">
            {searchable && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  value={searchTerm || ''}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-300"
                />
              </div>
            )}

            <div className="max-h-60 overflow-y-auto scrollbar-hide space-y-1">
              {options.length === 0 ? (
                <div className="px-3 py-4 text-xs font-bold text-slate-400 text-center">
                  {loading ? 'Loading options...' : 'No options found'}
                </div>
              ) : (
                options.map((option) => {
                  const isSelected = option.id === value;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onChange(option.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all ${
                        isSelected ? 'bg-brand-500/10 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {option.imageUrl && (
                        <img src={option.imageUrl} alt="" className="w-8 h-8 rounded-xl object-cover border border-slate-100 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black truncate">{option.label}</span>
                        {option.sub && <span className="block text-[10px] font-semibold text-slate-400 truncate">{option.sub}</span>}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-brand-500 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const initialTab: SettingsTab = new URLSearchParams(location.search).get('tab') === 'agent' ? 'agent' : 'user';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [savedAgentProfileId, setSavedAgentProfileId] = useState('');
  const currentAgentProfileId = savedAgentProfileId || user?.agentId || '';
  const hasUserAgentProfile = Boolean(currentAgentProfileId);
  const [agentFirstName, setAgentFirstName] = useState(user?.firstName || '');
  const [agentLastName, setAgentLastName] = useState(user?.lastName || '');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentNpn, setAgentNpn] = useState('');
  const [hasExistingNpn, setHasExistingNpn] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [existingProfileImageUrl, setExistingProfileImageUrl] = useState('');
  const [agentProfileLoading, setAgentProfileLoading] = useState(false);
  const [agentProfileError, setAgentProfileError] = useState<string | null>(null);
  const [agentProfileSaving, setAgentProfileSaving] = useState(false);
  const [agentProfileSaveError, setAgentProfileSaveError] = useState<string | null>(null);
  const [agentProfileSaveMessage, setAgentProfileSaveMessage] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [selectedAgencyName, setSelectedAgencyName] = useState('');
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [agenciesError, setAgenciesError] = useState<string | null>(null);
  const [uplines, setUplines] = useState<UplineOption[]>([]);
  const [selectedUplineId, setSelectedUplineId] = useState('');
  const [selectedUplineName, setSelectedUplineName] = useState('');
  const [uplineSearch, setUplineSearch] = useState('');
  const [uplinesLoading, setUplinesLoading] = useState(false);
  const [uplinesError, setUplinesError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(new URLSearchParams(location.search).get('tab') === 'agent' ? 'agent' : 'user');
  }, [location.search]);

  useEffect(() => {
    if (user?.agentId) setSavedAgentProfileId(user.agentId);
  }, [user?.agentId]);

  useEffect(() => {
    if (currentAgentProfileId) return;
    setAgentFirstName(user?.firstName || '');
    setAgentLastName(user?.lastName || '');
  }, [currentAgentProfileId, user?.firstName, user?.lastName]);

  useEffect(() => {
    if (activeTab !== 'agent') return;
    const token = localStorage.getItem('authToken');
    setAgenciesLoading(true);
    setAgenciesError(null);
    fetch(`${API_V2_BASE_URL}/utility/agencies`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
      })
      .then((data) => setAgencies(Array.isArray(data) ? data : data.items || data.agencies || []))
      .catch((error) => setAgenciesError(error instanceof Error ? error.message : 'Failed to load agencies'))
      .finally(() => setAgenciesLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (!selectedAgencyId) {
      setUplines([]);
      setSelectedUplineId('');
      return;
    }

    const token = localStorage.getItem('authToken');
    const params = new URLSearchParams({ agency_id: selectedAgencyId });
    setUplinesLoading(true);
    setUplinesError(null);
    fetch(`${API_V2_BASE_URL}/utility/agency/agents?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
      })
      .then((data) => setUplines(Array.isArray(data) ? data : data.items || data.agents || []))
      .catch((error) => setUplinesError(error instanceof Error ? error.message : 'Failed to load uplines'))
      .finally(() => setUplinesLoading(false));
  }, [selectedAgencyId]);

  useEffect(() => {
    if (!profileImage) {
      setProfileImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(profileImage);
    setProfileImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profileImage]);

  useEffect(() => {
    if (activeTab !== 'agent' || !currentAgentProfileId) return;

    const token = localStorage.getItem('authToken');
    setAgentProfileLoading(true);
    setAgentProfileError(null);
    fetch(`${API_V2_BASE_URL}/agent-profile/${currentAgentProfileId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const profile = mapAgentProfile(data);
        if (profile.id) setSavedAgentProfileId(profile.id);
        setAgentFirstName(profile.firstName || user.firstName || '');
        setAgentLastName(profile.lastName || user.lastName || '');
        setAgentPhone(profile.phone);
        setAgentEmail(profile.email);
        setAgentNpn(profile.npn ? String(profile.npn) : '');
        setHasExistingNpn(Boolean(profile.npn));
        setSelectedAgencyId(profile.agencyId);
        setSelectedAgencyName(profile.agencyName);
        setSelectedUplineId(profile.uplineId);
        setSelectedUplineName(profile.uplineName);
        setExistingProfileImageUrl(profile.imageUrl);
      })
      .catch((error) => setAgentProfileError(error instanceof Error ? error.message : 'Failed to load agent profile'))
      .finally(() => setAgentProfileLoading(false));
  }, [activeTab, currentAgentProfileId, user?.firstName, user?.lastName]);

  const validateAgentProfile = () => {
    if (!agentFirstName.trim()) return 'First name is required.';
    if (!agentLastName.trim()) return 'Last name is required.';
    if (!selectedAgencyId) return 'Agency is required.';
    if (!selectedUplineId) return 'Upline is required.';
    if (!agentNpn.trim()) return 'NPN is required.';
    if (!agentPhone.trim()) return 'Work phone is required.';
    if (!agentEmail.trim()) return 'Work email is required.';
    if (!currentAgentProfileId && !profileImage) return 'Profile image is required.';
    if (currentAgentProfileId && !profileImage && !existingProfileImageUrl) return 'Profile image is required.';
    return null;
  };

  const handleAgentProfileSubmit = async () => {
    const validationError = validateAgentProfile();
    setAgentProfileSaveError(validationError);
    setAgentProfileSaveMessage(null);
    if (validationError) return;

    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('first_name', agentFirstName.trim());
    formData.append('last_name', agentLastName.trim());
    formData.append('ref_ffl_agency', selectedAgencyId);
    formData.append('ref_agent_upline', selectedUplineId);
    formData.append('npn', agentNpn.trim());
    formData.append('phone', agentPhone.trim());
    formData.append('email', agentEmail.trim());

    const isUpdate = Boolean(currentAgentProfileId);
    setAgentProfileSaving(true);
    try {
      if (profileImage) {
        formData.append('profile', profileImage);
      } else if (isUpdate && existingProfileImageUrl) {
        formData.append('profile', await getFileFromUrl(existingProfileImageUrl));
      }

      const response = await fetch(`${API_V2_BASE_URL}/agent-profile${isUpdate ? `/${currentAgentProfileId}` : ''}`, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json().catch(() => null);
      if (data) {
        const profile = mapAgentProfile(data);
        if (profile.id) setSavedAgentProfileId(profile.id);
        if (profile.imageUrl) setExistingProfileImageUrl(profile.imageUrl);
        setHasExistingNpn(Boolean(profile.npn || agentNpn));
      }
      await refreshUser();
      setAgentProfileSaveMessage(isUpdate ? 'Agent profile saved.' : 'Agent profile created.');
    } catch (error) {
      setAgentProfileSaveError(error instanceof Error ? error.message : 'Failed to save agent profile.');
    } finally {
      setAgentProfileSaving(false);
    }
  };

  const filteredUplines = useMemo(() => {
    const query = uplineSearch.trim().toLowerCase();
    if (!query) return uplines;
    return uplines.filter((agent) => {
      const fullName = [agent.first_name || agent.firstName, agent.last_name || agent.lastName].filter(Boolean).join(' ');
      const label = `${fullName || agent.agent_name || agent.name || ''} ${agent.agent_npn || agent.npn || ''}`.toLowerCase();
      return label.includes(query);
    });
  }, [uplines, uplineSearch]);
  const agencyOptions = useMemo<DropdownOption[]>(() => {
    const options = agencies.map((agency) => ({
      id: agency.id,
      label: agency.name,
      imageUrl: typeof agency.logo === 'string' ? agency.logo : agency.logo?.url,
    }));
    if (selectedAgencyId && selectedAgencyName && !options.some((option) => option.id === selectedAgencyId)) {
      return [{ id: selectedAgencyId, label: selectedAgencyName }, ...options];
    }
    return options;
  }, [agencies, selectedAgencyId, selectedAgencyName]);
  const uplineOptions = useMemo<DropdownOption[]>(() => filteredUplines.map((agent) => {
    const id = agent.agent_id || agent.id || '';
    const fullName = [agent.first_name || agent.firstName, agent.last_name || agent.lastName].filter(Boolean).join(' ');
    const name = fullName || agent.agent_name || agent.name || 'Unnamed agent';
    const npn = agent.agent_npn || agent.npn;
    return {
      id,
      label: name,
      sub: npn ? `NPN: ${npn}` : undefined,
    };
  }).filter((option) => option.id), [filteredUplines]);
  const uplineDropdownOptions = useMemo<DropdownOption[]>(() => {
    if (selectedUplineId && selectedUplineName && !uplineOptions.some((option) => option.id === selectedUplineId)) {
      return [{ id: selectedUplineId, label: selectedUplineName }, ...uplineOptions];
    }
    return uplineOptions;
  }, [selectedUplineId, selectedUplineName, uplineOptions]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm font-semibold text-slate-400">Manage your user account and agent profile separately.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab('user')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'user' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <User className="w-4 h-4" />
          User Settings
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'agent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Briefcase className="w-4 h-4" />
          Agent Settings
        </button>
      </div>

      {activeTab === 'user' ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">User Settings</h2>
              <p className="text-xs font-semibold text-slate-400">This is the login/account identity.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow label="First Name" value={user?.firstName} />
            <FieldRow label="Last Name" value={user?.lastName} />
            <FieldRow label="Display Name" value={user?.name} />
            <FieldRow label="Email" value={user?.email} />
            <FieldRow label="Phone" value={user?.phone} />
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Agent Settings</h2>
                <p className="text-xs font-semibold text-slate-400">Create or manage your own agent profile.</p>
            </div>
          </div>

          {!hasUserAgentProfile && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-amber-900">No agent profile on this user account</p>
                <p className="text-xs font-semibold text-amber-700 mt-0.5">
                  Create an agent profile for this user account to attach your own NPN and producer identity.
                </p>
              </div>
            </div>
          )}

          {hasUserAgentProfile && agentProfileError && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-red-900">Could not load agent profile</p>
                <p className="text-xs font-semibold text-red-600 mt-0.5">{agentProfileError}</p>
              </div>
            </div>
          )}

          {agentProfileSaveError && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-700">{agentProfileSaveError}</p>
            </div>
          )}

          {agentProfileSaveMessage && (
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-emerald-700">{agentProfileSaveMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Profile Image</label>
              <label className="aspect-square w-full max-w-[180px] rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden hover:border-brand-300 hover:bg-brand-50/40 transition-all">
                {profileImagePreview || existingProfileImageUrl ? (
                  <img src={profileImagePreview || existingProfileImageUrl} alt="Agent profile preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-black text-slate-500">Square Image</span>
                    <span className="text-[10px] font-semibold text-slate-400 mt-1">Upload profile photo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setProfileImage(event.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                <input
                  value={agentFirstName}
                  disabled={agentProfileLoading}
                  onChange={(event) => setAgentFirstName(event.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                <input
                  value={agentLastName}
                  disabled={agentProfileLoading}
                  onChange={(event) => setAgentLastName(event.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                />
              </div>
              <div className="space-y-2">
                <AppDropdown
                  label="Agency"
                  placeholder="Select agency"
                  options={agencyOptions}
                  value={selectedAgencyId}
                  onChange={(value) => {
                    setSelectedAgencyId(value);
                    setSelectedAgencyName('');
                    setSelectedUplineId('');
                    setSelectedUplineName('');
                  }}
                  loading={agenciesLoading || agentProfileLoading}
                />
                {agenciesError && <p className="text-[11px] font-bold text-red-500">{agenciesError}</p>}
              </div>
              <div className="space-y-2">
                <AppDropdown
                  label="Upline"
                  placeholder={selectedAgencyId ? 'Select upline' : 'Select agency first'}
                  options={uplineDropdownOptions}
                  value={selectedUplineId}
                  onChange={(value) => {
                    setSelectedUplineId(value);
                    setSelectedUplineName('');
                  }}
                  disabled={!selectedAgencyId || uplinesLoading || agentProfileLoading}
                  loading={uplinesLoading || agentProfileLoading}
                  searchable
                  searchTerm={uplineSearch}
                  onSearchChange={setUplineSearch}
                />
                {uplinesError && <p className="text-[11px] font-bold text-red-500">{uplinesError}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">NPN</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={agentNpn}
                  disabled={agentProfileLoading || hasExistingNpn}
                  onChange={(event) => setAgentNpn(event.target.value)}
                  placeholder="National Producer Number"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                />
                {hasExistingNpn && (
                  <p className="text-[11px] font-semibold text-slate-400">NPN is locked once it exists on your agent profile.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Work Phone</label>
                <input
                  type="tel"
                  value={agentPhone}
                  disabled={agentProfileLoading}
                  onChange={(event) => setAgentPhone(event.target.value)}
                  placeholder="Work phone"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                />
                <p className="text-[11px] font-semibold text-slate-400">This is separate from your user phone. Add a work phone if you have one; it will be used for HQ SMS notifications.</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Work Email</label>
                <input
                  type="email"
                  value={agentEmail}
                  disabled={agentProfileLoading}
                  onChange={(event) => setAgentEmail(event.target.value)}
                  placeholder="Work email"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                />
                <p className="text-[11px] font-semibold text-slate-400">This is separate from your user email. Add a work email if you have one; it will be used for HQ email notifications.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={agentProfileLoading || agentProfileSaving}
              onClick={handleAgentProfileSubmit}
              className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black shadow-lg shadow-slate-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {agentProfileSaving ? 'Saving...' : hasUserAgentProfile ? 'Save Agent Profile' : 'Create Agent Profile'}
            </button>
          </div>
        </section>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-5 flex items-center gap-3 text-slate-500">
        <Mail className="w-4 h-4" />
        <span className="text-xs font-bold truncate">{user?.email || 'No email on file'}</span>
        <span className="w-1 h-1 rounded-full bg-slate-300" />
        <Phone className="w-4 h-4" />
        <span className="text-xs font-bold truncate">{user?.phone || 'No phone on file'}</span>
      </div>
    </div>
  );
};

export default SettingsPage;
