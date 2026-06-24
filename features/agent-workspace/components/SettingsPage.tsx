import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, BookOpen, Briefcase, Check, ChevronDown, Copy, ImagePlus, KeyRound, Mail, Phone, RefreshCw, Search, Settings, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

type SettingsTab = 'user' | 'agent' | 'mcp' | 'carrier';
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
type McpAuthTokenResponse = {
  Authorization?: string;
  mcp_pit_generated_date?: string;
  mcp_pit_expiration_date?: string;
};

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

const maskSecret = (value?: string) => value ? '**** **** **** ****' : 'Not configured';

const MCP_CONFIG_TEMPLATE = `{
  "mcpServers": {
    "policyhq": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://api1.simplyworkcrm.com/x2/mcp/V4CeR1bI/mcp/sse",
        "--header",
        "Authorization: Bearer \${Authorization_generated}"
      ]
    }
  }
}`;

const getMcpConfigSnippet = (authorization?: string) =>
  authorization
    ? MCP_CONFIG_TEMPLATE.replace('${Authorization_generated}', authorization)
    : MCP_CONFIG_TEMPLATE;

const parseMcpDate = (value?: string) => {
  if (!value) return null;
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const isDateExpired = (value?: string) => {
  const parsed = parseMcpDate(value);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() <= today.getTime();
};

const unwrapMcpPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) return payload[0] || {};
  return payload.item || payload.data || payload.mcp_authToken || payload.mcpAuthToken || payload;
};

const getMcpAuthorization = (payload: any) => {
  const data = unwrapMcpPayload(payload);
  if (!data || typeof data !== 'object') return '';
  return String(data.Authorization || data.authorization || data.authToken || data.token || '');
};

const normalizeMcpConfig = (payload: any): McpAuthTokenResponse | null => {
  const data = unwrapMcpPayload(payload);
  if (!data || typeof data !== 'object') return null;
  return {
    Authorization: getMcpAuthorization(data) ? 'configured' : '',
    mcp_pit_generated_date: data.mcp_pit_generated_date,
    mcp_pit_expiration_date: data.mcp_pit_expiration_date,
  };
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
  const tabParam = new URLSearchParams(location.search).get('tab');
  const initialTab: SettingsTab = tabParam === 'agent' || tabParam === 'mcp' || tabParam === 'carrier' ? tabParam : 'user';
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
  const [mcpConfig, setMcpConfig] = useState<McpAuthTokenResponse | null>(null);
  const [mcpConfigLoading, setMcpConfigLoading] = useState(false);
  const [mcpConfigError, setMcpConfigError] = useState<string | null>(null);
  const [mcpConfigSaving, setMcpConfigSaving] = useState(false);
  const [mcpConfigSaveError, setMcpConfigSaveError] = useState<string | null>(null);
  const [mcpConfigSaveMessage, setMcpConfigSaveMessage] = useState<string | null>(null);
  const [revealedAuthorization, setRevealedAuthorization] = useState('');
  const [mcpCopyMessage, setMcpCopyMessage] = useState<string | null>(null);
  const [mcpConfigCopyMessage, setMcpConfigCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextTab = new URLSearchParams(location.search).get('tab');
    setActiveTab(nextTab === 'agent' || nextTab === 'mcp' || nextTab === 'carrier' ? nextTab : 'user');
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

  useEffect(() => {
    if (activeTab !== 'mcp') return;

    const token = localStorage.getItem('authToken');
    setMcpConfigLoading(true);
    setMcpConfigError(null);
    setMcpConfigSaveError(null);
    setMcpConfigSaveMessage(null);
    setRevealedAuthorization('');
    setMcpCopyMessage(null);
    setMcpConfigCopyMessage(null);
    fetch(`${API_V2_BASE_URL}/mcp_authToken`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
      })
      .then((data) => setMcpConfig(normalizeMcpConfig(data)))
      .catch((error) => setMcpConfigError(error instanceof Error ? error.message : 'Failed to load MCP configuration'))
      .finally(() => setMcpConfigLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'mcp') {
      setRevealedAuthorization('');
      setMcpCopyMessage(null);
      setMcpConfigCopyMessage(null);
    }
  }, [activeTab]);

  const validateAgentProfile = () => {
    if (!agentFirstName.trim()) return 'First name is required.';
    if (!agentLastName.trim()) return 'Last name is required.';
    if (!selectedAgencyId) return 'Agency is required.';
    if (!selectedUplineId) return 'Direct upline is required.';
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

  const hasMcpAuthorization = Boolean(mcpConfig?.Authorization);
  const mcpExpirationState = hasMcpAuthorization ? isDateExpired(mcpConfig?.mcp_pit_expiration_date) : null;
  const isMcpExpirationUnavailable = hasMcpAuthorization && mcpExpirationState === null;
  const canManageMcpAuthorization = !hasMcpAuthorization || mcpExpirationState === true;
  const mcpAuthorizationActionLabel = hasMcpAuthorization ? 'Refresh Authorization' : 'Create Authorization';

  const handleMcpAuthorizationSubmit = async () => {
    if (!canManageMcpAuthorization || mcpConfigSaving) return;

    const confirmed = window.confirm(
      'Authorization is shown only once after creation or refresh. Save it securely before leaving this tab.'
    );
    if (!confirmed) return;

    const token = localStorage.getItem('authToken');
    setMcpConfigSaving(true);
    setMcpConfigSaveError(null);
    setMcpConfigSaveMessage(null);
    setMcpCopyMessage(null);
    setMcpConfigCopyMessage(null);

    try {
      const response = await fetch(`${API_V2_BASE_URL}/mcp_authToken`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const revealedToken = getMcpAuthorization(data);
      setMcpConfig(normalizeMcpConfig(data));
      setRevealedAuthorization(revealedToken);
      setMcpConfigSaveMessage(revealedToken ? 'Authorization created. Save it before leaving this tab.' : 'MCP configuration updated, but no Authorization value was returned.');
    } catch (error) {
      setMcpConfigSaveError(error instanceof Error ? error.message : 'Failed to update MCP Authorization.');
    } finally {
      setMcpConfigSaving(false);
    }
  };

  const handleCopyMcpAuthorization = async () => {
    if (!revealedAuthorization) return;
    try {
      await navigator.clipboard.writeText(revealedAuthorization);
      setMcpCopyMessage('Copied.');
    } catch {
      setMcpCopyMessage('Copy failed. Select and copy the value manually.');
    }
  };

  const handleCopyMcpConfig = async (authorization?: string) => {
    try {
      await navigator.clipboard.writeText(getMcpConfigSnippet(authorization));
      setMcpConfigCopyMessage(authorization ? 'Config with current Authorization copied.' : 'Config copied.');
    } catch {
      setMcpConfigCopyMessage('Copy failed. Select and copy the config manually.');
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
        <button
          onClick={() => setActiveTab('mcp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'mcp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <KeyRound className="w-4 h-4" />
          MCP Configuration
        </button>
        <button
          type="button"
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-slate-400 cursor-not-allowed opacity-70"
        >
          <ShieldCheck className="w-4 h-4" />
          Carrier Settings
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Soon</span>
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
      ) : activeTab === 'carrier' ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Carrier Settings</h2>
              <p className="text-xs font-semibold text-slate-400">Coming soon.</p>
            </div>
          </div>
        </section>
      ) : activeTab === 'mcp' ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">MCP Configuration</h2>
                <p className="text-xs font-semibold text-slate-400">Review and manage your MCP Authorization.</p>
              </div>
            </div>
            <div>
              <button
                type="button"
                disabled={!canManageMcpAuthorization || mcpConfigLoading || mcpConfigSaving}
                onClick={handleMcpAuthorizationSubmit}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <RefreshCw className={`w-4 h-4 ${mcpConfigSaving ? 'animate-spin' : ''}`} />
                {mcpConfigSaving ? 'Working...' : mcpAuthorizationActionLabel}
              </button>
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-relaxed text-amber-800">
              Authorization is shown only once after creation or refresh. Save it securely before leaving this tab. MCP Authorization expires after 1 year for security purposes, so refresh it regularly after expiration.
            </p>
          </div>

          {mcpConfigError && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-red-900">Could not load MCP configuration</p>
                <p className="text-xs font-semibold text-red-600 mt-0.5">{mcpConfigError}</p>
              </div>
            </div>
          )}

          {mcpConfigSaveError && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-700">{mcpConfigSaveError}</p>
            </div>
          )}

          {mcpConfigSaveMessage && (
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-emerald-700">{mcpConfigSaveMessage}</p>
            </div>
          )}

          {isMcpExpirationUnavailable && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-slate-600">Expiration date unavailable. Refresh is disabled until the expiration date is returned as MM-DD-YYYY.</p>
            </div>
          )}

          {mcpConfigLoading ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm font-bold text-slate-500">
              Loading MCP configuration...
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 rounded-2xl border border-slate-100 bg-slate-950 p-5 text-white">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorization</p>
                      <p className={`mt-2 font-mono text-sm font-black tracking-wider ${revealedAuthorization ? 'text-amber-300 break-all' : 'text-amber-300'}`}>
                        {revealedAuthorization || maskSecret(mcpConfig?.Authorization)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${mcpConfig?.Authorization ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                      {mcpConfig?.Authorization ? 'Configured' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold text-slate-400">
                      {revealedAuthorization ? 'This value will be hidden when you leave this tab.' : 'The token is intentionally masked unless you create or refresh it.'}
                    </p>
                    {revealedAuthorization && (
                      <div className="flex items-center gap-3">
                        {mcpCopyMessage && <span className="text-xs font-bold text-emerald-300">{mcpCopyMessage}</span>}
                        <button
                          type="button"
                          onClick={handleCopyMcpAuthorization}
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy Authorization
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <FieldRow label="Generated Date" value={mcpConfig?.mcp_pit_generated_date} />
                <FieldRow label="Expiration Date" value={mcpConfig?.mcp_pit_expiration_date} />
                <FieldRow
                  label="Token Status"
                  value={
                    !hasMcpAuthorization
                      ? 'Not configured'
                      : mcpExpirationState === true
                        ? 'Expired'
                        : mcpExpirationState === false
                          ? 'Active'
                          : 'Expiration unavailable'
                  }
                />
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-sm">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black text-slate-900">How to use PolicyHQ MCP</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Use your Authorization to connect your AI client to the PolicyHQ MCP server. Once connected, your agent can request PolicyHQ data through available MCP tools.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    ['1', 'Get your Authorization', 'Create or refresh your Authorization above, then save it securely. It is only shown once.'],
                    ['2', 'Configure your agent/client', 'Add the PolicyHQ MCP server to your AI client configuration. Replace ${Authorization_generated} with the Authorization you saved.'],
                    ['3', 'Start making requests', 'Ask your AI client to use PolicyHQ MCP tools. New tools will be added over time.'],
                  ].map(([number, title, description]) => (
                    <div key={number} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-amber-300">{number}</div>
                      <p className="text-sm font-black text-slate-900">{title}</p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900 bg-slate-950">
                  <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client configuration</p>
                      <p className="text-xs font-semibold text-slate-500">Paste this into your AI client MCP config.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {mcpConfigCopyMessage && <span className="text-xs font-bold text-emerald-300">{mcpConfigCopyMessage}</span>}
                      <button
                        type="button"
                        onClick={() => handleCopyMcpConfig()}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy config
                      </button>
                      {revealedAuthorization && (
                        <button
                          type="button"
                          onClick={() => handleCopyMcpConfig(revealedAuthorization)}
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy with current Authorization
                        </button>
                      )}
                    </div>
                  </div>
                  <pre className="max-h-80 overflow-auto p-4 text-xs font-semibold leading-relaxed text-amber-100"><code>{MCP_CONFIG_TEMPLATE}</code></pre>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available tools</p>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {[
                      {
                        name: 'policies',
                        description: 'Fetches your policies in PolicyHQ.',
                      },
                      {
                        name: 'downlines',
                        description: 'Shows your full team hierarchy and downline structure from your agent profile.',
                      },
                      {
                        name: 'team_policies',
                        description: 'Fetches policy records for your full team, including your own policies and all downline-owned policies.',
                      },
                      {
                        name: 'splits',
                        description: 'Fetches your split policy records, split production, partner summaries, and split policy breakdowns.',
                      },
                    ].map((tool) => (
                      <div key={tool.name} className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="font-mono text-sm font-black text-slate-900">{tool.name}</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{tool.description}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-400">PolicyHQ MCP is new. More tools will be added over time.</p>
                </div>
              </div>
            </div>
          )}
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
                  label="Direct Upline"
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
