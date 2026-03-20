import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings, Building2, MapPin, CreditCard, Save, CheckCircle2,
  AlertCircle, Loader2, Plus, AlertTriangle
} from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import type {
  BusinessProfile,
  BusinessType,
  Industry,
  BillingCycle,
} from '../../types/settings';
import {
  BUSINESS_TYPE_LABELS,
  INDUSTRY_LABELS,
  BILLING_CYCLE_LABELS,
} from '../../types/settings';

type Tab = 'profile' | 'address' | 'financial';

// ── Validation helpers ───────────────────────────────

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP',
]);

/** Format phone as (XXX) XXX-XXXX */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Format EIN as XX-XXXXXXX */
function formatEin(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/** Format ZIP as XXXXX or XXXXX-XXXX */
function formatZip(raw: string): string {
  const digits = raw.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '');
  const clean = digits.replace(/-/g, '').slice(0, 9);
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

/** Auto-prepend https:// to website */
function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Validate email format */
function isValidEmail(email: string): boolean {
  if (!email) return true; // empty is ok (optional field)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate EIN format (XX-XXXXXXX) */
function isValidEin(ein: string): boolean {
  if (!ein) return true;
  return /^\d{2}-\d{7}$/.test(ein);
}

/** Validate ZIP format */
function isValidZip(zip: string): boolean {
  if (!zip) return true;
  return /^\d{5}(-\d{4})?$/.test(zip);
}

/** Validate phone has 10 digits */
function isValidPhone(phone: string): boolean {
  if (!phone) return true;
  return phone.replace(/\D/g, '').length === 10;
}

// ── Field error type ─────────────────────────────────
interface FieldErrors {
  [key: string]: string;
}

// ══════════════════════════════════════════════════════

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const savedFormRef = useRef<string>('');

  // ── Form state ─────────────────────────────────────
  const [form, setForm] = useState({
    company_name: '',
    dba_name: '',
    ein: '',
    phone: '',
    email: '',
    website: '',
    business_type: '' as BusinessType | '',
    industry: '' as Industry | '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    default_payment_terms: 30,
    default_billing_cycle: 'monthly' as BillingCycle,
    default_markup_pct: 18,
    invoice_prefix: 'INV',
  });

  // ── Track dirty state ──────────────────────────────
  useEffect(() => {
    const current = JSON.stringify(form);
    setDirty(current !== savedFormRef.current);
  }, [form]);

  // ── Unsaved changes: browser beforeunload ──────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ── Load profile ───────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsService.getProfile();
      if (data) {
        setProfile(data);
        setIsNew(false);
        const loaded = {
          company_name: data.company_name || '',
          dba_name: data.dba_name || '',
          ein: data.ein || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          business_type: (data.business_type || '') as BusinessType | '',
          industry: (data.industry || '') as Industry | '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          country: data.country || 'US',
          default_payment_terms: data.default_payment_terms ?? 30,
          default_billing_cycle: (data.default_billing_cycle || 'monthly') as BillingCycle,
          default_markup_pct: Number(data.default_markup_pct ?? 18),
          invoice_prefix: data.invoice_prefix || 'INV',
        };
        setForm(loaded);
        savedFormRef.current = JSON.stringify(loaded);
      } else {
        setIsNew(true);
        savedFormRef.current = JSON.stringify(form);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Validate all fields ────────────────────────────
  const validate = (): boolean => {
    const e: FieldErrors = {};

    // Profile tab
    if (!form.company_name.trim()) e.company_name = 'Company name is required';
    if (form.ein && !isValidEin(form.ein)) e.ein = 'Format: XX-XXXXXXX (2 digits, dash, 7 digits)';
    if (form.phone && !isValidPhone(form.phone)) e.phone = 'Enter a 10-digit phone number';
    if (form.email && !isValidEmail(form.email)) e.email = 'Enter a valid email address';
    if (form.website && form.website.trim() && !/^https?:\/\/.+\..+/.test(normalizeWebsite(form.website))) {
      e.website = 'Enter a valid URL (e.g. company.com)';
    }

    // Address tab
    if (form.state && !US_STATES.has(form.state.toUpperCase())) e.state = 'Enter a valid US state code';
    if (form.zip_code && !isValidZip(form.zip_code)) e.zip_code = 'Format: 06604 or 06604-7236';
    if (form.city && form.city.trim().length < 2) e.city = 'City must be at least 2 characters';

    // Financial tab
    if (form.default_payment_terms < 0 || form.default_payment_terms > 365) e.default_payment_terms = '0–365 days';
    if (form.default_markup_pct < 0 || form.default_markup_pct > 100) e.default_markup_pct = '0–100%';
    if (form.invoice_prefix && !/^[A-Z0-9-]+$/i.test(form.invoice_prefix)) e.invoice_prefix = 'Letters, numbers, and dashes only';

    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ───────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) {
      // Jump to the tab with the first error
      const errorKeys = Object.keys(fieldErrors);
      if (errorKeys.length > 0) {
        const profileFields = ['company_name', 'dba_name', 'ein', 'phone', 'email', 'website', 'business_type', 'industry'];
        const addressFields = ['address_line1', 'address_line2', 'city', 'state', 'zip_code'];
        const firstErr = errorKeys[0];
        if (profileFields.includes(firstErr)) setActiveTab('profile');
        else if (addressFields.includes(firstErr)) setActiveTab('address');
        else setActiveTab('financial');
      }
      return;
    }

    // Normalize website before saving
    const normalizedForm = { ...form };
    if (normalizedForm.website) {
      normalizedForm.website = normalizeWebsite(normalizedForm.website);
      setForm(prev => ({ ...prev, website: normalizedForm.website }));
    }
    // Uppercase state
    if (normalizedForm.state) {
      normalizedForm.state = normalizedForm.state.toUpperCase();
      setForm(prev => ({ ...prev, state: normalizedForm.state }));
    }
    // Uppercase invoice prefix
    if (normalizedForm.invoice_prefix) {
      normalizedForm.invoice_prefix = normalizedForm.invoice_prefix.toUpperCase();
      setForm(prev => ({ ...prev, invoice_prefix: normalizedForm.invoice_prefix }));
    }

    try {
      setSaving(true);
      setError(null);

      const payload: any = { ...normalizedForm };
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = undefined;
      });
      payload.company_name = normalizedForm.company_name;
      payload.country = normalizedForm.country || 'US';

      let result: BusinessProfile;
      if (isNew) {
        result = await settingsService.createProfile({
          company_name: normalizedForm.company_name,
          dba_name: normalizedForm.dba_name || undefined,
          ein: normalizedForm.ein || undefined,
          phone: normalizedForm.phone || undefined,
          email: normalizedForm.email || undefined,
          website: normalizedForm.website || undefined,
          business_type: normalizedForm.business_type || undefined,
          industry: normalizedForm.industry || undefined,
        });
        setIsNew(false);
      } else {
        result = await settingsService.updateProfile(payload);
      }

      setProfile(result);
      savedFormRef.current = JSON.stringify(form);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // ── Tab switch with unsaved check ──────────────────
  const handleTabSwitch = (tab: Tab) => {
    if (dirty) {
      setPendingTab(tab);
    } else {
      setActiveTab(tab);
    }
  };

  const confirmTabSwitch = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const cancelTabSwitch = () => {
    setPendingTab(null);
  };

  // ── Field updaters with formatting ─────────────────
  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const setFormatted = (field: string, formatter: (v: string) => string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: formatter(e.target.value) }));
    if (fieldErrors[field]) setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const setNum = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: Number(e.target.value) || 0 }));
    if (fieldErrors[field]) setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const setUpper = (field: string, maxLen?: number) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let val = e.target.value.toUpperCase();
    if (maxLen) val = val.slice(0, maxLen);
    setForm(prev => ({ ...prev, [field]: val }));
    if (fieldErrors[field]) setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  // ── Render helpers ─────────────────────────────────
  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: 'profile', label: 'Business Profile', icon: Building2 },
    { key: 'address', label: 'Address', icon: MapPin },
    { key: 'financial', label: 'Financial', icon: CreditCard },
  ];

  const inputCls = (field?: string) => {
    const hasErr = field && fieldErrors[field];
    return `w-full px-3 py-2 rounded-lg border text-sm text-gray-900 focus:outline-none focus:ring-2 transition-all ${
      hasErr
        ? 'border-red-300 bg-red-50/30 focus:ring-red-500/30 focus:border-red-400'
        : 'border-gray-200 bg-white focus:ring-blue-500/30 focus:border-blue-400'
    }`;
  };
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
  const errorCls = 'text-xs text-red-500 mt-1';
  const sectionCls = 'bg-white rounded-2xl border border-gray-100 p-6 shadow-sm';
  const hintCls = 'text-xs text-gray-400 mt-1';

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">
              {isNew ? 'Set up your business profile' : 'Manage your business profile and preferences'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors shadow-sm ${
              saved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : isNew ? 'Create Profile' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Onboarding banner */}
      {isNew && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Complete your business profile</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Fill in your company details to unlock AI insights, contractor matching, and invoicing.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Validation summary */}
      {Object.keys(fieldErrors).length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm font-medium text-red-700 mb-1">Please fix the following:</p>
          <ul className="text-xs text-red-600 space-y-0.5">
            {Object.entries(fieldErrors).map(([field, msg]) => (
              <li key={field}>• {msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Unsaved changes dialog */}
      {pendingTab && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Unsaved Changes</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              You have unsaved changes. Switch tabs without saving?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelTabSwitch}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Stay
              </button>
              <button
                onClick={() => { handleSave().then(() => { if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); } }); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Save & Switch
              </button>
              <button
                onClick={confirmTabSwitch}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-50 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabSwitch(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ──────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className={sectionCls}>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Company Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Company Name *</label>
                <input className={inputCls('company_name')} value={form.company_name} onChange={set('company_name')} placeholder="e.g. Metro Aerial Equipment LLC" />
                {fieldErrors.company_name && <p className={errorCls}>{fieldErrors.company_name}</p>}
              </div>
              <div>
                <label className={labelCls}>DBA (Doing Business As)</label>
                <input className={inputCls()} value={form.dba_name} onChange={set('dba_name')} placeholder="Optional trade name" />
              </div>
              <div>
                <label className={labelCls}>EIN / Tax ID</label>
                <input
                  className={inputCls('ein')}
                  value={form.ein}
                  onChange={setFormatted('ein', formatEin)}
                  placeholder="XX-XXXXXXX"
                  maxLength={10}
                />
                {fieldErrors.ein ? <p className={errorCls}>{fieldErrors.ein}</p> : form.ein && <p className={hintCls}>Federal Employer Identification Number</p>}
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  className={inputCls('phone')}
                  value={form.phone}
                  onChange={setFormatted('phone', formatPhone)}
                  placeholder="(203) 555-4040"
                  maxLength={14}
                />
                {fieldErrors.phone && <p className={errorCls}>{fieldErrors.phone}</p>}
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  className={inputCls('email')}
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  onBlur={() => {
                    if (form.email && !isValidEmail(form.email)) {
                      setFieldErrors(prev => ({ ...prev, email: 'Enter a valid email address' }));
                    }
                  }}
                  placeholder="info@company.com"
                />
                {fieldErrors.email && <p className={errorCls}>{fieldErrors.email}</p>}
              </div>
              <div>
                <label className={labelCls}>Website</label>
                <input
                  className={inputCls('website')}
                  value={form.website}
                  onChange={set('website')}
                  onBlur={() => {
                    if (form.website && form.website.trim()) {
                      const normalized = normalizeWebsite(form.website);
                      setForm(prev => ({ ...prev, website: normalized }));
                    }
                  }}
                  placeholder="company.com"
                />
                {fieldErrors.website ? <p className={errorCls}>{fieldErrors.website}</p> : <p className={hintCls}>https:// will be added automatically</p>}
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Classification</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Business Type</label>
                <select className={inputCls()} value={form.business_type} onChange={set('business_type')}>
                  <option value="">Select...</option>
                  {Object.entries(BUSINESS_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <select className={inputCls()} value={form.industry} onChange={set('industry')}>
                  <option value="">Select...</option>
                  {Object.entries(INDUSTRY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Address Tab ──────────────────────────────── */}
      {activeTab === 'address' && (
        <div className="space-y-6">
          <div className={sectionCls}>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Primary Business Address (HQ)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Address Line 1</label>
                <input className={inputCls('address_line1')} value={form.address_line1} onChange={set('address_line1')} placeholder="Street address" />
                {fieldErrors.address_line1 && <p className={errorCls}>{fieldErrors.address_line1}</p>}
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address Line 2</label>
                <input className={inputCls()} value={form.address_line2} onChange={set('address_line2')} placeholder="Suite, floor, etc." />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input className={inputCls('city')} value={form.city} onChange={set('city')} placeholder="Bridgeport" />
                {fieldErrors.city && <p className={errorCls}>{fieldErrors.city}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>State</label>
                  <input
                    className={inputCls('state')}
                    value={form.state}
                    onChange={setUpper('state', 2)}
                    onBlur={() => {
                      if (form.state && !US_STATES.has(form.state)) {
                        setFieldErrors(prev => ({ ...prev, state: 'Invalid state code' }));
                      }
                    }}
                    placeholder="CT"
                    maxLength={2}
                  />
                  {fieldErrors.state && <p className={errorCls}>{fieldErrors.state}</p>}
                </div>
                <div>
                  <label className={labelCls}>ZIP Code</label>
                  <input
                    className={inputCls('zip_code')}
                    value={form.zip_code}
                    onChange={setFormatted('zip_code', formatZip)}
                    onBlur={() => {
                      if (form.zip_code && !isValidZip(form.zip_code)) {
                        setFieldErrors(prev => ({ ...prev, zip_code: 'Format: 06604 or 06604-7236' }));
                      }
                    }}
                    placeholder="06604"
                    maxLength={10}
                  />
                  {fieldErrors.zip_code && <p className={errorCls}>{fieldErrors.zip_code}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Branch list preview */}
          {!isNew && (
            <div className={sectionCls}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Business Sites</h2>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  Add Site
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Manage branches, warehouses, and yards from the Sites tab (coming next).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Financial Tab ────────────────────────────── */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className={sectionCls}>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Billing Defaults</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Default Payment Terms (days)</label>
                <input
                  className={inputCls('default_payment_terms')}
                  type="number"
                  value={form.default_payment_terms}
                  onChange={setNum('default_payment_terms')}
                  min={0}
                  max={365}
                />
                {fieldErrors.default_payment_terms ? <p className={errorCls}>{fieldErrors.default_payment_terms}</p> : <p className={hintCls}>Net 30, Net 60, etc.</p>}
              </div>
              <div>
                <label className={labelCls}>Billing Cycle</label>
                <select className={inputCls()} value={form.default_billing_cycle} onChange={set('default_billing_cycle')}>
                  {Object.entries(BILLING_CYCLE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Default Markup %</label>
                <input
                  className={inputCls('default_markup_pct')}
                  type="number"
                  value={form.default_markup_pct}
                  onChange={setNum('default_markup_pct')}
                  min={0}
                  max={100}
                  step={0.5}
                />
                {fieldErrors.default_markup_pct ? (
                  <p className={errorCls}>{fieldErrors.default_markup_pct}</p>
                ) : form.default_markup_pct > 50 ? (
                  <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Markup over 50% — are you sure?
                  </p>
                ) : null}
              </div>
              <div>
                <label className={labelCls}>Invoice Prefix</label>
                <input
                  className={inputCls('invoice_prefix')}
                  value={form.invoice_prefix}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
                    setForm(prev => ({ ...prev, invoice_prefix: val }));
                    if (fieldErrors.invoice_prefix) setFieldErrors(prev => { const n = { ...prev }; delete n.invoice_prefix; return n; });
                  }}
                  placeholder="INV"
                  maxLength={10}
                />
                {fieldErrors.invoice_prefix ? <p className={errorCls}>{fieldErrors.invoice_prefix}</p> : <p className={hintCls}>e.g. INV, ERL, CMS</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
