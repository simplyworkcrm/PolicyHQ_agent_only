import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, 
    ChevronRight, 
    Loader2, 
    Shield, 
    User, 
    Users,
    Calendar, 
    CreditCard, 
    MapPin, 
    FileText, 
    Briefcase, 
    MessageSquare, 
    Send,
    Phone,
    Copy,
    CheckCircle2,
    Hash,
    Globe,
    Tag,
    Activity,
    DollarSign,
    Lock,
    Pencil,
    Check,
    X,
    Split,
    ChevronDown,
    Search,
    Info,
    Folder,
    Clock,
    Plus,
    Trash2,
    AlertCircle,
    RotateCcw
} from 'lucide-react';
import { agentPolicyDetailsApi } from '../services/agentPolicyDetailsApi';
import { agentSplitsApi } from '../services/agentSplitsApi';
import { agentPoliciesApi } from '../services/agentPoliciesApi';
import { useAuth } from '../../../context/AuthContext';

// Type matching the provided JSON response for Coverage
interface CoverageData {
    policy_number: string;
    carrier: {
        id: string;
        label: string;
        custom_carrier: string | null;
    };
    product: string;
    initial_draft_date: string;
    recurring_draft_day: number;
    face_amount: number;
    beneficiary: string | null;
    monthly_premium: number;
    annual_premium: number;
    status: {
        id: string;
        label: string;
    };
    paidstatus: {
        id: string | null;
        label: string | null;
    };
    appointment_highlights: string | null;
    pending_follow_up: string | null;
    isLocked?: boolean;
}

interface ClientProfileData {
    name: string;
    phone: string;
    state: string;
    source: {
        id: string;
        label: string;
        custom_source: string | null;
    } | null;
    type: {
        id: string;
        label: string;
        custom_type: string | null;
    } | null;
}

interface SplitRecord {
    id: string;
    created_at: number;
    policy_id: string;
    on_split_agent_id: string;
    on_split_agent_name: string;
    agent_on_split_percent: number;
    toDelete?: boolean;
}

interface DraftSplit {
    tempId: string;
    npn: string;
    percent: string;
    agentName: string | null;
    resolvedAgentId?: string;
    isValidating: boolean;
    error: string | null;
    isValid: boolean;
}

interface PolicyComment {
    created_at: number;
    type: string;
    message: string;
    _commentby: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

interface MetaOption {
    id: string | number;
    name: string;
}

// Full State Data for Normalization
const US_STATE_DATA = [
    { name: 'Alabama', value: 'AL' }, { name: 'Alaska', value: 'AK' }, { name: 'Arizona', value: 'AZ' },
    { name: 'Arkansas', value: 'AR' }, { name: 'California', value: 'CA' }, { name: 'Colorado', value: 'CO' },
    { name: 'Connecticut', value: 'CT' }, { name: 'Delaware', value: 'DE' }, { name: 'Florida', value: 'FL' },
    { name: 'Georgia', value: 'GA' }, { name: 'Hawaii', value: 'HI' }, { name: 'Idaho', value: 'ID' },
    { name: 'Illinois', value: 'IL' }, { name: 'Indiana', value: 'IN' }, { name: 'Iowa', value: 'IA' },
    { name: 'Kansas', value: 'KS' }, { name: 'Kentucky', value: 'KY' }, { name: 'Louisiana', value: 'LA' },
    { name: 'Maine', value: 'ME' }, { name: 'Maryland', value: 'MD' }, { name: 'Massachusetts', value: 'MA' },
    { name: 'Michigan', value: 'MI' }, { name: 'Minnesota', value: 'MN' }, { name: 'Mississippi', value: 'MS' },
    { name: 'Missouri', value: 'MO' }, { name: 'Montana', value: 'MT' }, { name: 'Nebraska', value: 'NE' },
    { name: 'Nevada', value: 'NV' }, { name: 'New Hampshire', value: 'NH' }, { name: 'New Jersey', value: 'NJ' },
    { name: 'New Mexico', value: 'NM' }, { name: 'New York', value: 'NY' }, { name: 'North Carolina', value: 'NC' },
    { name: 'North Dakota', value: 'ND' }, { name: 'Ohio', value: 'OH' }, { name: 'Oklahoma', value: 'OK' },
    { name: 'Oregon', value: 'OR' }, { name: 'Pennsylvania', value: 'PA' }, { name: 'Rhode Island', value: 'RI' },
    { name: 'South Carolina', value: 'SC' }, { name: 'South Dakota', value: 'SD' }, { name: 'Tennessee', value: 'TN' },
    { name: 'Texas', value: 'TX' }, { name: 'Utah', value: 'UT' }, { name: 'Vermont', value: 'VT' },
    { name: 'Virginia', value: 'VA' }, { name: 'Washington', value: 'WA' }, { name: 'West Virginia', value: 'WV' },
    { name: 'Wisconsin', value: 'WI' }, { name: 'Wyoming', value: 'WY' }
];

const formatDate = (timestamp: number | string) => {
    if (!timestamp) return 'N/A';
    
    // Fix: Parse YYYY-MM-DD strings in local time to avoid UTC-based shift
    if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
        const [year, month, day] = timestamp.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// --- SINGLE DATE PICKER COMPONENT ---
const SingleDatePicker: React.FC<{
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Select Date" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Parse value using local time logic for calendar view
    let initialDate = new Date();
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        initialDate = new Date(y, m - 1, d);
    } else if (value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) initialDate = d;
    }

    const [currentMonth, setCurrentMonth] = useState(initialDate); 

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeMonth = (delta: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + delta);
        setCurrentMonth(newMonth);
    };

    const generateCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    };

    const handleDateClick = (date: Date) => {
        // Output in YYYY-MM-DD format for consistency with input[type=date] values or ISO string
        // Using ISO date part string for standard compatibility
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${day}`);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-full bg-transparent outline-none text-slate-900 flex items-center justify-between cursor-pointer"
            >
                <span className="truncate">{value ? formatDate(value) : <span className="text-slate-400 font-normal">{placeholder}</span>}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-4 min-w-[280px] z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                     <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="font-bold text-slate-900 text-sm">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 mb-2 text-center">{['S','M','T','W','T','F','S'].map((d,i) => <span key={i} className="text-[10px] font-bold text-slate-400">{d}</span>)}</div>
                    <div className="grid grid-cols-7 gap-1">
                        {generateCalendar().map((date, i) => {
                            if (!date) return <div key={i} className="aspect-square" />;
                            
                            // Check if selected
                            let isSelected = false;
                            if (value) {
                                let vDate: Date;
                                // Handle YYYY-MM-DD string manually to prevent UTC shift
                                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                    const [y, m, d] = value.split('-').map(Number);
                                    vDate = new Date(y, m - 1, d);
                                } else {
                                    vDate = new Date(value);
                                }

                                if (!isNaN(vDate.getTime())) {
                                    // Compare YYYY-MM-DD
                                    if (date.getDate() === vDate.getDate() && 
                                        date.getMonth() === vDate.getMonth() && 
                                        date.getFullYear() === vDate.getFullYear()) {
                                        isSelected = true;
                                    }
                                }
                            }

                            return (
                                <div key={i} className="aspect-square">
                                    <button 
                                        onClick={() => handleDateClick(date)} 
                                        className={`
                                            w-full h-full flex items-center justify-center rounded-lg text-xs font-bold transition-all
                                            ${isSelected ? 'bg-brand-500 text-white shadow-md shadow-brand-200' : 'text-slate-700 hover:bg-slate-50'}
                                        `}
                                    >
                                        {date.getDate()}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CUSTOM DROPDOWN COMPONENT ---
interface CustomDropdownProps {
    value: string | number;
    options: (string | MetaOption | { name: string, value: string })[];
    onChange: (value: string | number) => void;
    placeholder?: string;
    searchable?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
    value, 
    options, 
    onChange, 
    placeholder = "Select...",
    searchable = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper to extract display label and underlying value
    const getOptionDetails = (opt: any) => {
        if (typeof opt === 'string') return { label: opt, val: opt };
        // Handle US_STATE_DATA structure {name, value} or MetaOption {name, id}
        const label = opt.name || opt.label;
        const val = opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : opt.name);
        return { label, val };
    };

    const selectedOption = options.find(opt => {
        const { val } = getOptionDetails(opt);
        return String(val) === String(value);
    });

    const displayValue = selectedOption ? getOptionDetails(selectedOption).label : '';

    const filteredOptions = options.filter(opt => {
        const { label } = getOptionDetails(opt);
        return label.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-full bg-transparent outline-none text-slate-900 flex items-center justify-between cursor-pointer ${!displayValue ? 'text-slate-400' : ''}`}
            >
                <span className="truncate">{displayValue || placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-64 flex flex-col">
                    {searchable && (
                        <div className="p-2 border-b border-slate-50 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input 
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 rounded-lg py-1.5 pl-8 pr-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                                    placeholder="Search..."
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-1 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const { label, val } = getOptionDetails(opt);
                                const isSelected = String(val) === String(value);
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            onChange(val);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-between group ${isSelected ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <span>{label}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-3 text-center text-xs text-slate-400 font-medium">No matches found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- INPUT DISPLAY COMPONENT ---
const InputDisplay = ({ 
    label, 
    value, 
    name, 
    onChange, 
    isEditing, 
    icon, 
    fullWidth,
    type = 'text',
    placeholder = '—',
    options = [],
    customInput,
    onDropdownChange,
    tooltip,
    step
}: { 
    label: string; 
    value: React.ReactNode; 
    name?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isEditing?: boolean;
    icon?: React.ReactNode; 
    fullWidth?: boolean;
    type?: 'text' | 'number' | 'date' | 'select' | 'phone';
    placeholder?: string;
    options?: (string | MetaOption | {name: string, value: string})[];
    customInput?: React.ReactNode;
    onDropdownChange?: (val: any) => void;
    tooltip?: string;
    step?: string;
}) => {
    // Determine display value for read-only mode
    let displayValue = value;
    if (!isEditing && type === 'select' && options.length > 0) {
        // Try to find the label for the value
        const found = options.find(opt => {
            const val = typeof opt === 'object' ? (opt as any).value || (opt as any).id : opt;
            return String(val) === String(value);
        });
        if (found) {
            displayValue = typeof found === 'object' ? (found as any).name || (found as any).label : found;
        }
    }

    return (
        <div className={`w-full ${fullWidth ? 'col-span-2' : ''}`}>
            <div className="flex items-center gap-1.5 ml-1 mb-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">{label}</label>
                {tooltip && isEditing && (
                    <div className="relative flex items-center">
                        <Info className="peer w-3 h-3 text-slate-300 hover:text-brand-500 cursor-help transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[10px] font-medium leading-relaxed rounded-xl shadow-xl opacity-0 peer-hover:opacity-100 transition-opacity duration-200 delay-100 pointer-events-none z-50">
                            {tooltip}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                    </div>
                )}
            </div>
            <div className={`w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 flex items-center gap-3 transition-colors min-h-[54px] ${isEditing ? 'ring-2 ring-brand-500/20 bg-white border-brand-500' : 'hover:border-slate-200 hover:bg-white group'}`}>
                {icon && <span className={`transition-colors shrink-0 ${isEditing ? 'text-brand-500' : 'text-slate-400 group-hover:text-brand-500'}`}>{icon}</span>}
                <div className="flex-1 w-full min-w-0 h-full flex items-center">
                    {isEditing ? (
                        customInput ? customInput :
                        type === 'select' ? (
                            <CustomDropdown 
                                value={value as string} 
                                options={options} 
                                onChange={(val) => onDropdownChange && onDropdownChange(val)}
                                placeholder={placeholder}
                                searchable={options.length > 10}
                            />
                        ) : type === 'date' ? (
                            // Use native date or custom component passed via customInput
                            // Fallback if no customInput provided for date type
                            <input 
                                type="date"
                                name={name}
                                value={(value as string) ?? ''}
                                onChange={onChange}
                                className="w-full bg-transparent outline-none text-slate-900 font-bold uppercase tracking-wider text-xs h-full"
                            />
                        ) : (
                            <input 
                                type={type === 'phone' ? 'text' : type}
                                name={name}
                                value={(value as string | number) ?? ''}
                                onChange={onChange}
                                step={step}
                                className="w-full bg-transparent outline-none text-slate-900 placeholder:text-slate-300 h-full"
                                placeholder={placeholder}
                                readOnly={false}
                            />
                        )
                    ) : (
                        <span className="truncate block text-left w-full">{displayValue || placeholder}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

interface AgentPolicyDetailsProps {
    queueOverride?: string[];
    startIndexOverride?: number;
    onClose?: () => void;
    modal?: boolean;
}

export const AgentPolicyDetails: React.FC<AgentPolicyDetailsProps> = ({
    queueOverride,
    startIndexOverride,
    onClose,
    modal = false,
}) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const routeState = location.state || {};
    const queue = queueOverride ?? routeState.queue ?? [];
    const startIndex = startIndexOverride ?? routeState.startIndex ?? 0;

    const [currentIndex, setCurrentIndex] = useState(startIndex);
    
    // Data States
    const [coverage, setCoverage] = useState<CoverageData | null>(null);
    const [clientProfile, setClientProfile] = useState<ClientProfileData | null>(null);
    const [clientProfileForm, setClientProfileForm] = useState<ClientProfileData | null>(null);
    
    const [loading, setLoading] = useState(true);

    // Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingCoverage, setIsEditingCoverage] = useState(false);
    const [coverageForm, setCoverageForm] = useState<Partial<CoverageData>>({});

    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Meta Data State
    const [sourceOptions, setSourceOptions] = useState<MetaOption[]>([]);
    const [typeOptions, setTypeOptions] = useState<MetaOption[]>([]);
    const [carrierOptions, setCarrierOptions] = useState<MetaOption[]>([]);
    const [statusOptions, setStatusOptions] = useState<MetaOption[]>([]);
    const [paidStatusOptions, setPaidStatusOptions] = useState<MetaOption[]>([]);
    
    // Splits State
    const [splits, setSplits] = useState<SplitRecord[]>([]);
    const [loadingSplits, setLoadingSplits] = useState(false);
    
    // Splits Edit State
    const [isEditingSplits, setIsEditingSplits] = useState(false);
    const [splitsForm, setSplitsForm] = useState<SplitRecord[]>([]);
    // New Splits (Drafts)
    const [draftSplits, setDraftSplits] = useState<DraftSplit[]>([]);
    const [savingSplits, setSavingSplits] = useState(false);

    // Comments State
    const [commentType, setCommentType] = useState<'public' | 'private'>('public');
    const [comments, setComments] = useState<PolicyComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!queue || queue.length === 0) {
            if (onClose) onClose();
            else navigate('/policies');
        }
    }, [queue, navigate, onClose]);

    // Fetch Meta Data
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [sourcesData, typesData, carriersData, statusesData, paidStatusesData] = await Promise.all([
                    agentPolicyDetailsApi.getContactSources(),
                    agentPolicyDetailsApi.getContactTypes(),
                    agentPolicyDetailsApi.getCarriers(),
                    agentPolicyDetailsApi.getPolicyStatuses(),
                    agentPolicyDetailsApi.getPaidStatuses()
                ]);
                
                const mapOptions = (data: any[], idKey: string, labelKeyCandidates: string[]) => {
                    if (!Array.isArray(data)) return [];
                    return data.map(item => {
                        const foundLabelKey = labelKeyCandidates.find(k => item[k] !== undefined && item[k] !== null);
                        return {
                            id: item[idKey] || item.id,
                            name: foundLabelKey ? item[foundLabelKey] : 'Unknown'
                        };
                    });
                };

                const sources = mapOptions(sourcesData, 'contactSource_id', ['name', 'source', 'label']);
                const types = mapOptions(typesData, 'contactType_id', ['name', 'type', 'label']);
                
                // Map Carriers, Statuses, and Paid Statuses
                const carriers = carriersData.map((c: any) => ({ id: String(c.id), name: c.label }));
                const statuses = statusesData.map((s: any) => ({ id: String(s.id), name: s.label }));
                const paidStatuses = paidStatusesData.map((p: any) => ({ id: String(p.id), name: p.label }));

                setSourceOptions(sources);
                setTypeOptions(types);
                setCarrierOptions(carriers);
                setStatusOptions(statuses);
                setPaidStatusOptions(paidStatuses);
            } catch (error) {
                console.error("Failed to fetch meta options", error);
            }
        };
        fetchMeta();
    }, []);

    // State Normalization Helper
    const normalizeStateValue = (val: string | undefined | null) => {
        if (!val) return '';
        const upper = val.trim().toUpperCase();
        // Try to match by Full Name first, then by Abbr
        const byName = US_STATE_DATA.find(s => s.name.toUpperCase() === upper);
        if (byName) return byName.name;
        const byVal = US_STATE_DATA.find(s => s.value === upper);
        if (byVal) return byVal.name;
        return val;
    };

    // Fetch Data (Coverage + Client Profile)
    useEffect(() => {
        const fetchData = async () => {
            if (queue.length === 0) return;
            setLoading(true);
            const policyId = queue[currentIndex];
            try {
                const [covData, profData] = await Promise.all([
                    agentPolicyDetailsApi.getPolicyCoverage(policyId),
                    agentPolicyDetailsApi.getClientProfile(policyId)
                ]);

                setCoverage(covData);
                setCoverageForm(covData);
                
                setClientProfile(profData);
                setClientProfileForm({
                    ...profData,
                    state: normalizeStateValue(profData.state)
                });
            } catch (error) {
                console.error("Failed to fetch policy details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentIndex, queue]);

    // Fetch Splits
    useEffect(() => {
        const policyId = queue[currentIndex];
        if (policyId) {
            setLoadingSplits(true);
            agentSplitsApi.getPolicySplits(policyId)
                .then(data => setSplits(data))
                .catch(err => console.error("Failed to fetch splits", err))
                .finally(() => setLoadingSplits(false));
        }
    }, [currentIndex, queue]);

    // Fetch Comments
    useEffect(() => {
        const policyId = queue[currentIndex];
        if (!policyId) return;
        
        setComments([]);

        const fetchComments = async () => {
            setLoadingComments(true);
            try {
                let data;
                if (commentType === 'public') {
                    data = await agentPolicyDetailsApi.getPublicComments(policyId);
                } else {
                    data = await agentPolicyDetailsApi.getPrivateComments(policyId);
                }
                setComments(data);
            } catch (error) {
                console.error("Failed to fetch comments", error);
            } finally {
                setLoadingComments(false);
            }
        };
        fetchComments();
    }, [currentIndex, queue, commentType]);

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const handleSendComment = async () => {
        const policyId = queue[currentIndex];
        if (!newComment.trim() || !policyId) return;
        setSendingComment(true);
        try {
            const newCommentRes = await agentPolicyDetailsApi.createComment(policyId, newComment, commentType);
            setComments(prev => [...prev, newCommentRes]);
            setNewComment('');
        } catch (error) {
            console.error("Failed to send comment", error);
        } finally {
            setSendingComment(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendComment();
        }
    };

    const handleNext = () => {
        if (currentIndex < queue.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handleCoverageInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'monthly_premium') {
            const monthly = parseFloat(value);
            const annual = isNaN(monthly) ? 0 : monthly * 12;
            setCoverageForm(prev => ({ ...prev, monthly_premium: monthly, annual_premium: annual }));
            return;
        }
        if (name === 'recurring_draft_day') {
            let val = parseInt(value);
            if (isNaN(val)) {
                setCoverageForm(prev => ({ ...prev, recurring_draft_day: undefined }));
                return;
            }
            if (val < 1) val = 1;
            if (val > 31) val = 31;
            setCoverageForm(prev => ({ ...prev, recurring_draft_day: val }));
            return;
        }
        setCoverageForm(prev => ({ ...prev, [name]: value }));
    };

    const handleInitialDraftDateChange = (dateString: string) => {
        setCoverageForm(prev => ({ ...prev, initial_draft_date: dateString }));
    };

    const handleCoverageDropdownChange = (name: 'carrier' | 'status' | 'paidstatus', value: any) => {
        if (name === 'carrier') {
            const selected = carrierOptions.find(o => String(o.id) === String(value));
            setCoverageForm(prev => ({
                ...prev,
                carrier: { id: String(value), label: selected?.name || 'Unknown', custom_carrier: null }
            }));
        } else if (name === 'status') {
            const selected = statusOptions.find(o => String(o.id) === String(value));
            setCoverageForm(prev => ({
                ...prev,
                status: { id: String(value), label: selected?.name || 'Unknown' }
            }));
        } else if (name === 'paidstatus') {
            const selected = paidStatusOptions.find(o => String(o.id) === String(value));
            setCoverageForm(prev => ({
                ...prev,
                paidstatus: { id: String(value), label: selected?.name || 'Unknown' }
            }));
        }
    };

    const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (!clientProfileForm) return;
        if (name === 'phone') {
            const cleaned = value.replace(/[^0-9+]/g, '');
            const truncated = cleaned.slice(0, 13);
            setClientProfileForm({ ...clientProfileForm, phone: truncated });
            return;
        }
        if (name === 'custom_source') {
             setClientProfileForm({
                ...clientProfileForm,
                source: { ...clientProfileForm.source!, custom_source: value }
            });
            return;
        }
        if (name === 'custom_type') {
             setClientProfileForm({
                ...clientProfileForm,
                type: { ...clientProfileForm.type!, custom_type: value }
            });
            return;
        }
        setClientProfileForm({ ...clientProfileForm, [name]: value });
    };

    const handleProfileDropdownChange = (name: 'state' | 'source' | 'type', value: any) => {
        if (!clientProfileForm) return;
        if (name === 'state') {
            setClientProfileForm({ ...clientProfileForm, state: value });
        } else if (name === 'source') {
             const selected = sourceOptions.find(o => String(o.id) === String(value));
             setClientProfileForm({ 
                 ...clientProfileForm, 
                 source: { id: String(value), label: selected?.name || 'Unknown', custom_source: null }
             });
        } else if (name === 'type') {
             const selected = typeOptions.find(o => String(o.id) === String(value));
             setClientProfileForm({ 
                 ...clientProfileForm, 
                 type: { id: String(value), label: selected?.name || 'Unknown', custom_type: null }
             });
        }
    };

    const handleSaveProfile = async () => {
        const policyId = queue[currentIndex];
        if (!policyId || !clientProfileForm) return;
        try {
            await agentPolicyDetailsApi.updateClientProfile(policyId, clientProfileForm);
            setClientProfile(clientProfileForm);
            setIsEditingProfile(false);
        } catch (e) {
            console.error("Save failed", e);
        }
    };

    const handleSaveCoverage = async () => {
        const policyId = queue[currentIndex];
        if (!policyId) return;
        try {
            await agentPolicyDetailsApi.updatePolicyCoverage(policyId, coverageForm);
            setCoverage(prev => ({ ...prev, ...coverageForm } as CoverageData));
            setIsEditingCoverage(false);
        } catch (e) {
            console.error("Save failed", e);
        }
    };

    const handleCancelProfile = () => {
        setClientProfileForm(clientProfile);
        setIsEditingProfile(false);
    };

    const handleCancelCoverage = () => {
        setCoverageForm(coverage || {});
        setIsEditingCoverage(false);
    };

    const handleEditSplits = () => {
        setSplitsForm(splits);
        setDraftSplits([]);
        setIsEditingSplits(true);
    };

    const handleSplitPercentChange = (id: string, value: string) => {
        setSplitsForm(prev => prev.map(s => s.id === id ? { ...s, agent_on_split_percent: Number(value) } : s));
    };

    const handleAddDraftSplit = () => {
        setDraftSplits(prev => [...prev, {
            tempId: Date.now().toString(),
            npn: '',
            percent: '',
            agentName: null,
            isValidating: false,
            error: null,
            isValid: false,
            resolvedAgentId: undefined
        }]);
    };

    const handleRemoveDraftSplit = (tempId: string) => {
        setDraftSplits(prev => prev.filter(s => s.tempId !== tempId));
    };

    const handleRemoveExistingSplit = (id: string) => {
        setSplitsForm(prev => prev.map(s => s.id === id ? { ...s, toDelete: !s.toDelete } : s));
    };

    const validateDraftNpn = async (tempId: string, npn: string) => {
        setDraftSplits(prev => prev.map(s => s.tempId === tempId ? { ...s, isValidating: true, error: null, agentName: null, isValid: false, resolvedAgentId: undefined } : s));
        try {
            const data = await agentSplitsApi.validateAgent(npn);
            setDraftSplits(prev => prev.map(s => s.tempId === tempId ? { ...s, isValidating: false, agentName: data.name, resolvedAgentId: data.agent_id || data.id, isValid: true } : s));
        } catch (error) {
            setDraftSplits(prev => prev.map(s => s.tempId === tempId ? { ...s, isValidating: false, error: 'Invalid Agent NPN', isValid: false, resolvedAgentId: undefined } : s));
        }
    };

    const handleDraftNpnChange = (tempId: string, value: string) => {
        const cleanVal = value.replace(/\D/g, '');
        setDraftSplits(prev => prev.map(s => s.tempId === tempId ? { ...s, npn: cleanVal, error: null, isValid: false, agentName: null, resolvedAgentId: undefined } : s));
    };

    const handleDraftPercentageChange = (tempId: string, value: string) => {
        setDraftSplits(prev => prev.map(s => s.tempId === tempId ? { ...s, percent: value } : s));
    };

    const handleSaveSplits = async () => {
        const policyId = queue[currentIndex];
        setSavingSplits(true);
        const existingPayload = splitsForm.map(s => ({
            id: s.id,
            policy_id: s.policy_id,
            on_split_agent_id: s.on_split_agent_id,
            agent_on_split_percent: s.agent_on_split_percent,
            toDelete: s.toDelete || false
        }));
        const newPayload = draftSplits.filter(d => d.isValid).map(d => ({
            policy_id: policyId,
            on_split_agent_id: d.resolvedAgentId || d.npn, 
            agent_on_split_percent: Number(d.percent),
            toDelete: false
        }));
        const finalPayload = [...existingPayload, ...newPayload];
        try {
            await agentSplitsApi.updatePolicySplits(policyId, finalPayload);
            const refreshedSplits = await agentSplitsApi.getPolicySplits(policyId);
            setSplits(refreshedSplits);
            setSplitsForm(refreshedSplits);
            setDraftSplits([]);
            setIsEditingSplits(false);
        } catch (e) {
            console.error("Failed to save splits", e);
        } finally {
            setSavingSplits(false);
        }
    };

    const handleCancelSplits = () => {
        setIsEditingSplits(false);
        setDraftSplits([]);
    };

    const handleDeletePolicy = async () => {
        const policyId = queue[currentIndex];
        if (!policyId || !deleteReason.trim()) return;
        
        setIsDeleting(true);
        try {
            await agentPoliciesApi.deletePolicy(policyId, deleteReason);
            // On success, close modal and move to next or go back
            setIsDeleteModalOpen(false);
            setDeleteReason('');
            
            if (onClose) {
                onClose();
            } else if (queue.length > 1) {
                // Remove from local queue if possible and move index
                const nextQueue = queue.filter((id: string) => id !== policyId);
                const nextIndex = currentIndex >= nextQueue.length ? nextQueue.length - 1 : currentIndex;
                navigate('.', { state: { queue: nextQueue, startIndex: nextIndex }, replace: true });
            } else {
                navigate('/policies');
            }
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete policy. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (queue.length === 0) return null;

    const displayProfileSource = clientProfileForm?.source?.label || '—';
    const displayProfileType = clientProfileForm?.type?.label || '—';
    const profileName = isEditingProfile ? clientProfileForm?.name : clientProfile?.name;
    const profilePhone = clientProfileForm?.phone;
    const profileState = clientProfileForm?.state;
    const isLocked = coverage?.isLocked || false;
    const hasSplits = splits.length > 0 || (isEditingSplits && (splitsForm.length > 0 || draftSplits.length > 0));

    return (
        <div className={`${modal ? 'min-h-full bg-slate-100/80 p-5 sm:p-6' : 'min-h-[calc(100vh-6rem)] -m-6 p-8'} font-sans`}>
            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100 shadow-xl shadow-red-500/5">
                            <Trash2 className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Delete Policy?</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                            This action is permanent and cannot be undone. Please provide a reason for deletion.
                        </p>
                        
                        <div className="w-full space-y-4 mb-8 text-left">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reason for deletion</label>
                            <textarea 
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Required..."
                                rows={3}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-200 transition-all placeholder:text-slate-300 resize-none"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button 
                                onClick={() => { setIsDeleteModalOpen(false); setDeleteReason(''); }}
                                className="py-4 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                            >
                                Keep Policy
                            </button>
                            <button 
                                onClick={handleDeletePolicy}
                                disabled={!deleteReason.trim() || isDeleting}
                                className="py-4 rounded-2xl bg-red-500 text-white text-xs font-black hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <button 
                        onClick={() => onClose ? onClose() : navigate('/policies')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {modal ? 'Close Details' : 'Back to Portfolio'}
                    </button>

                    <div className="flex items-center gap-4">
                        {!isLocked && (
                            <button 
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-100 text-red-500 font-bold text-xs hover:bg-red-50 shadow-sm transition-all group"
                            >
                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>Delete Policy</span>
                            </button>
                        )}
                        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                            <button 
                                onClick={handlePrev} 
                                disabled={currentIndex === 0}
                                className="p-2 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex flex-col items-center px-4 min-w-[100px]">
                                <span className="text-xs font-black text-slate-900">POLICY {currentIndex + 1}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">OF {queue.length}</span>
                            </div>
                            <button 
                                onClick={handleNext} 
                                disabled={currentIndex === queue.length - 1}
                                className="p-2 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {isLocked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 mb-6 animate-in slide-in-from-top-2">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-800">Policy is locked</h4>
                            <p className="text-xs text-amber-700 font-medium">Modifications are restricted to comments only.</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[600px]">
                        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Loading Policy Data...</p>
                    </div>
                ) : coverage && clientProfile ? (
                    <>
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                            
                            {/* COLUMN 1: CLIENT PROFILE */}
                            <div className="xl:col-span-3 space-y-6">
                                {/* Profile Card - same as before */}
                                <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center relative group">
                                    {!isLocked && (
                                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                                            {isEditingProfile ? (
                                                <>
                                                    <button onClick={handleSaveProfile} className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={handleCancelProfile} className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-all shadow-sm">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => setIsEditingProfile(true)} className="p-2.5 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-brand-500 transition-all shadow-sm border border-slate-100">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-50 to-white rounded-t-[2.5rem]"></div>
                                    <div className="relative z-10 w-24 h-24 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-slate-900/10 border-4 border-white mb-6">
                                        {(profileName || '').substring(0,2).toUpperCase()}
                                    </div>
                                    <h2 className="relative z-10 text-2xl font-black text-slate-900 tracking-tight mb-8 text-center w-full">
                                        {isEditingProfile ? (
                                            <input 
                                                className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none focus:ring-2 focus:ring-brand-500/20"
                                                name="name"
                                                value={profileName}
                                                onChange={handleProfileInputChange}
                                            />
                                        ) : profileName}
                                    </h2>
                                    <div className="w-full space-y-3 relative z-10">
                                        <InputDisplay 
                                            label="Mobile" 
                                            value={profilePhone} 
                                            name="phone"
                                            onChange={handleProfileInputChange}
                                            isEditing={isEditingProfile}
                                            icon={<Phone className="w-4 h-4"/>} 
                                        />
                                        <InputDisplay 
                                            label="State" 
                                            value={profileState} 
                                            name="state"
                                            onChange={handleProfileInputChange}
                                            isEditing={isEditingProfile}
                                            type="select"
                                            options={US_STATE_DATA.map(s => ({ name: s.name, value: s.name }))} 
                                            onDropdownChange={(val) => handleProfileDropdownChange('state', val)}
                                            icon={<MapPin className="w-4 h-4"/>} 
                                        />
                                        <div className="space-y-3">
                                            <InputDisplay 
                                                label="Source" 
                                                value={isEditingProfile ? (clientProfileForm?.source?.id || '') : displayProfileSource} 
                                                name="source"
                                                onChange={handleProfileInputChange}
                                                isEditing={isEditingProfile}
                                                type="select"
                                                options={sourceOptions}
                                                onDropdownChange={(val) => handleProfileDropdownChange('source', val)}
                                                icon={<Globe className="w-4 h-4"/>} 
                                                tooltip="Where did this lead originate?"
                                            />
                                            <InputDisplay 
                                                label="Type" 
                                                value={isEditingProfile ? (clientProfileForm?.type?.id || '') : displayProfileType} 
                                                name="type"
                                                onChange={handleProfileInputChange}
                                                isEditing={isEditingProfile}
                                                type="select"
                                                options={typeOptions}
                                                onDropdownChange={(val) => handleProfileDropdownChange('type', val)}
                                                icon={<Tag className="w-4 h-4"/>} 
                                                tooltip="Lead category (e.g. Life, Health)"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COLUMN 2: COVERAGE DETAILS */}
                            <div className="xl:col-span-6 space-y-6">
                                {/* Coverage Card */}
                                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative">
                                    {!isLocked && (
                                        <div className="absolute top-8 right-8 z-20 flex gap-2">
                                            {isEditingCoverage ? (
                                                <>
                                                    <button onClick={handleSaveCoverage} className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={handleCancelCoverage} className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-all shadow-sm">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => setIsEditingCoverage(true)} className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-brand-500 transition-all shadow-sm border border-slate-200/50">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center border border-brand-100 shadow-sm">
                                            <Shield className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Policy Coverage</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">Details & Benefits</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <InputDisplay 
                                            label="Carrier" 
                                            value={isEditingCoverage ? coverageForm.carrier?.id : coverage.carrier.label} 
                                            name="carrier"
                                            isEditing={isEditingCoverage}
                                            type="select"
                                            options={carrierOptions}
                                            onDropdownChange={(val) => handleCoverageDropdownChange('carrier', val)}
                                            icon={<Briefcase className="w-4 h-4"/>} 
                                        />
                                        <InputDisplay 
                                            label="Product" 
                                            value={isEditingCoverage ? coverageForm.product : coverage.product} 
                                            name="product"
                                            onChange={handleCoverageInputChange}
                                            isEditing={isEditingCoverage}
                                            icon={<Tag className="w-4 h-4"/>} 
                                        />
                                        <InputDisplay 
                                            label="Policy Number" 
                                            value={isEditingCoverage ? coverageForm.policy_number : coverage.policy_number} 
                                            name="policy_number"
                                            onChange={handleCoverageInputChange}
                                            isEditing={isEditingCoverage}
                                            icon={<Hash className="w-4 h-4"/>} 
                                        />
                                        <InputDisplay 
                                            label="Status" 
                                            value={isEditingCoverage ? coverageForm.status?.id : coverage.status.label} 
                                            name="status"
                                            isEditing={isEditingCoverage}
                                            type="select"
                                            options={statusOptions}
                                            onDropdownChange={(val) => handleCoverageDropdownChange('status', val)}
                                            icon={<Activity className="w-4 h-4"/>} 
                                        />
                                        <InputDisplay 
                                            label="Paid Status" 
                                            value={isEditingCoverage ? coverageForm.paidstatus?.id : coverage.paidstatus.label} 
                                            name="paidstatus"
                                            isEditing={isEditingCoverage}
                                            type="select"
                                            options={paidStatusOptions}
                                            onDropdownChange={(val) => handleCoverageDropdownChange('paidstatus', val)}
                                            icon={<CreditCard className="w-4 h-4"/>} 
                                        />
                                        <InputDisplay 
                                            label="Beneficiary" 
                                            value={isEditingCoverage ? coverageForm.beneficiary : coverage.beneficiary} 
                                            name="beneficiary"
                                            onChange={handleCoverageInputChange}
                                            isEditing={isEditingCoverage}
                                            icon={<User className="w-4 h-4"/>} 
                                        />
                                        <div className="col-span-2 h-px bg-slate-100 my-2"></div>
                                        <InputDisplay 
                                            label="Face Amount" 
                                            value={isEditingCoverage ? coverageForm.face_amount : `$${coverage.face_amount?.toLocaleString()}`} 
                                            name="face_amount"
                                            onChange={handleCoverageInputChange}
                                            isEditing={isEditingCoverage}
                                            type="number"
                                            step="0.01"
                                            icon={<Shield className="w-4 h-4"/>} 
                                        />
                                        <InputDisplay 
                                            label="Monthly Premium" 
                                            value={isEditingCoverage ? coverageForm.monthly_premium : `$${coverage.monthly_premium?.toLocaleString()}`} 
                                            name="monthly_premium"
                                            onChange={handleCoverageInputChange}
                                            isEditing={isEditingCoverage}
                                            type="number"
                                            step="0.01"
                                            icon={<DollarSign className="w-4 h-4"/>} 
                                        />
                                        <InputDisplay 
                                            label="Annual Premium" 
                                            value={isEditingCoverage ? `$${(coverageForm.annual_premium || 0).toLocaleString()}` : `$${coverage.annual_premium?.toLocaleString()}`} 
                                            name="annual_premium"
                                            isEditing={false} 
                                            icon={<DollarSign className="w-4 h-4"/>} 
                                        />
                                        <InputDisplay 
                                            label="Draft Day" 
                                            value={isEditingCoverage ? coverageForm.recurring_draft_day : coverage.recurring_draft_day} 
                                            name="recurring_draft_day"
                                            onChange={handleCoverageInputChange}
                                            isEditing={isEditingCoverage}
                                            icon={<Calendar className="w-4 h-4"/>} 
                                            type="number"
                                        />
                                        <InputDisplay 
                                            label="Initial Draft Date" 
                                            value={isEditingCoverage ? coverageForm.initial_draft_date : formatDate(coverage.initial_draft_date)} 
                                            name="initial_draft_date"
                                            isEditing={isEditingCoverage}
                                            customInput={
                                                <SingleDatePicker 
                                                    value={coverageForm.initial_draft_date || ''}
                                                    onChange={handleInitialDraftDateChange}
                                                />
                                            }
                                            icon={<Calendar className="w-4 h-4"/>} 
                                            fullWidth
                                        />
                                        <div className="col-span-2 h-px bg-slate-100 my-2"></div>
                                        <InputDisplay 
                                            label="Highlights" 
                                            value={isEditingCoverage ? coverageForm.appointment_highlights : coverage.appointment_highlights} 
                                            name="appointment_highlights"
                                            onChange={handleCoverageInputChange}
                                            isEditing={isEditingCoverage}
                                            icon={<FileText className="w-4 h-4"/>} 
                                            fullWidth
                                        />
                                        <InputDisplay 
                                            label="Pending Follow Up" 
                                            value={isEditingCoverage ? coverageForm.pending_follow_up : coverage.pending_follow_up} 
                                            name="pending_follow_up"
                                            onChange={handleCoverageInputChange}
                                            isEditing={isEditingCoverage}
                                            icon={<Clock className="w-4 h-4"/>} 
                                            fullWidth
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* COLUMN 3: SPLITS & NOTES */}
                            <div className="xl:col-span-3 space-y-6">
                                {/* Splits Card - same as before */}
                                <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 relative group">
                                    {!isLocked && (
                                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                                            {isEditingSplits ? (
                                                <>
                                                    <button onClick={handleSaveSplits} disabled={savingSplits} className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md flex items-center justify-center disabled:opacity-50">
                                                        {savingSplits ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button onClick={handleCancelSplits} disabled={savingSplits} className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-all shadow-sm flex items-center justify-center disabled:opacity-50">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={handleEditSplits} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-brand-500 transition-all shadow-sm border border-slate-200/50">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center border border-purple-100">
                                            <Split className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Splits</h3>
                                    </div>
                                    {loadingSplits ? (
                                        <div className="py-4 text-center text-xs text-slate-400">Loading splits...</div>
                                    ) : hasSplits ? (
                                        <div className="space-y-4">
                                            {isEditingSplits && splitsForm.map(split => (
                                                <div key={split.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${split.toDelete ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className={`flex items-center gap-3 ${split.toDelete ? 'opacity-50' : ''}`}>
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {split.on_split_agent_name.substring(0,2)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-bold ${split.toDelete ? 'text-red-400 line-through' : 'text-slate-700'}`}>{split.on_split_agent_name}</span>
                                                            {split.toDelete && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Marked for Delete</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="number"
                                                            value={split.agent_on_split_percent}
                                                            disabled={split.toDelete}
                                                            onChange={(e) => handleSplitPercentChange(split.id, e.target.value)}
                                                            className="w-12 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center py-1 px-1 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:bg-slate-100"
                                                        />
                                                        <span className="text-xs font-bold text-slate-500">%</span>
                                                        <button 
                                                            onClick={() => handleRemoveExistingSplit(split.id)}
                                                            className={`ml-1 p-1.5 rounded-lg transition-colors ${split.toDelete ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                                            title={split.toDelete ? "Undo delete" : "Delete split"}
                                                        >
                                                            {split.toDelete ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {!isEditingSplits && splits.map(split => (
                                                <div key={split.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {split.on_split_agent_name.substring(0,2)}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{split.on_split_agent_name}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-900">{split.agent_on_split_percent}%</span>
                                                </div>
                                            ))}
                                            {isEditingSplits && draftSplits.map((draft, i) => (
                                                <div key={draft.tempId} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm animate-in slide-in-from-top-2">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                                                                {splitsForm.length + i + 1}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Agent NPN</span>
                                                            {draft.isValidating && <Loader2 className="w-3 h-3 animate-spin text-brand-500 ml-1" />}
                                                            {draft.isValid && <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-1" />}
                                                            {draft.error && <AlertCircle className="w-3 h-3 text-red-500 ml-1" />}
                                                        </div>
                                                        <button onClick={() => handleRemoveDraftSplit(draft.tempId)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-3 mb-2">
                                                        <input 
                                                            placeholder="Enter NPN"
                                                            value={draft.npn}
                                                            onChange={(e) => handleDraftNpnChange(draft.tempId, e.target.value)}
                                                            onBlur={(e) => e.target.value.length >= 1 && validateDraftNpn(draft.tempId, e.target.value)}
                                                            className={`flex-1 bg-slate-50 border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${draft.error ? 'border-red-200 text-red-600 bg-red-50' : 'border-slate-200 text-slate-700'}`}
                                                        />
                                                        <div className="relative w-20">
                                                            <input 
                                                                placeholder="%"
                                                                value={draft.percent}
                                                                disabled={!draft.isValid}
                                                                onChange={(e) => handleDraftPercentageChange(draft.tempId, e.target.value)}
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-6 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                    {draft.agentName ? (
                                                        <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit">{draft.agentName}</p>
                                                    ) : draft.error ? (
                                                        <p className="text-[10px] font-bold text-red-500">{draft.error}</p>
                                                    ) : (
                                                        <p className="text-[10px] font-bold text-slate-300 italic">Validate NPN first</p>
                                                    )}
                                                </div>
                                            ))}
                                            {isEditingSplits && (
                                                <button 
                                                    onClick={handleAddDraftSplit}
                                                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add Split Agent
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center">
                                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-400">No splits added. You will receive 100% commission.</p>
                                            
                                            {isEditingSplits && (
                                                <button 
                                                    onClick={handleAddDraftSplit}
                                                    className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-bold text-slate-600 hover:text-brand-500 hover:border-brand-200 transition-all flex items-center gap-2"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Add Split Agent
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Comments / Notes Card */}
                                <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col h-[500px]">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
                                            <Folder className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Activity</h3>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex p-1 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                                        {(['public', 'private'] as const).map(type => (
                                            <button 
                                                key={type}
                                                onClick={() => setCommentType(type)}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${commentType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    {/* List - UPDATED CHAT UI */}
                                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent p-2">
                                        {loadingComments ? (
                                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                                        ) : comments.length > 0 ? (
                                            comments.map((comment, i) => {
                                                const isMe = comment._commentby?.id === user?.id;
                                                const initials = `${comment._commentby?.first_name?.[0] || '?'}${comment._commentby?.last_name?.[0] || '?'}`;
                                                
                                                return (
                                                    <div key={i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        {/* Avatar */}
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm border-2 ${isMe ? 'bg-brand-50 text-brand-600 border-white' : 'bg-slate-100 text-slate-500 border-white'}`}>
                                                            {initials}
                                                        </div>
                                                        
                                                        {/* Message Group */}
                                                        <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                            {/* Metadata */}
                                                            <div className={`flex items-baseline gap-2 mb-1.5 opacity-80 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                                <span className="text-[10px] font-bold text-slate-800">
                                                                    {comment._commentby?.first_name} {comment._commentby?.last_name}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Bubble */}
                                                            <div className={`
                                                                px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm
                                                                ${isMe 
                                                                    ? 'bg-brand-500 text-white rounded-tr-none' 
                                                                    : 'bg-white border border-slate-100 text-slate-600 rounded-tl-none'
                                                                }
                                                            `}>
                                                                {comment.message}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-10 text-xs text-slate-400 font-medium">
                                                No notes found.
                                            </div>
                                        )}
                                        <div ref={commentsEndRef}></div>
                                    </div>

                                    {/* Input */}
                                    <div className="mt-4 pt-4 border-t border-slate-50">
                                        <div className="relative">
                                            <input 
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder={`Add a ${commentType} note...`}
                                                className="w-full pl-4 pr-10 py-3 bg-slate-50 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-400"
                                            />
                                            <button 
                                                onClick={handleSendComment}
                                                disabled={!newComment.trim() || sendingComment}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                                            >
                                                {sendingComment ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};
