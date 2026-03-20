import { useState, useEffect, useRef } from 'react';
import { Building2, MapPin, Phone, Mail, ArrowRight, Loader2, Briefcase } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import type { Industry } from '../../types/settings';
import { INDUSTRY_LABELS } from '../../types/settings';
import { useGooglePlaces, type PlaceSuggestion } from '@/hooks/useGooglePlaces';

interface Props {
  onComplete: () => void;
}

interface FormState {
  company_name: string;
  industry: Industry | '';
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
}

interface FormErrors {
  [key: string]: string;
}

// ── Format helpers ───────────────────────────────────

/** Format phone as (XXX) XXX-XXXX — digits only */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Format ZIP as XXXXX or XXXXX-XXXX */
function formatZip(raw: string): string {
  const clean = raw.replace(/[^\d]/g, '').slice(0, 9);
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

/** Validate email */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate phone has 10 digits */
function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, '').length === 10;
}

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP',
]);

// ══════════════════════════════════════════════════════

export function OnboardingWizard({ onComplete }: Props) {
  const [form, setForm] = useState<FormState>({
    company_name: '',
    industry: '',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Google Places ──────────────────────────────────
  const places = useGooglePlaces();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddressChange = (val: string) => {
    setForm(prev => ({ ...prev, address_line1: val }));
    if (errors.address_line1) setErrors(prev => ({ ...prev, address_line1: '' }));

    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);

    if (places.loaded && val.length >= 3) {
      addressDebounceRef.current = setTimeout(() => {
        places.search(val);
        setShowSuggestions(true);
      }, 200);
    } else {
      setShowSuggestions(false);
      places.clear();
    }
  };

  const handlePlaceSelect = async (suggestion: PlaceSuggestion) => {
    setShowSuggestions(false);
    places.clear();

    const details = await places.selectPlace(suggestion.place_id);
    if (!details) return;

    setForm(prev => ({
      ...prev,
      address_line1: details.address_line1 || suggestion.main_text,
      city: details.city || prev.city,
      state: details.state || prev.state,
      zip_code: details.zip_code || prev.zip_code,
    }));

    setErrors(prev => ({ ...prev, address_line1: '', city: '', state: '', zip_code: '' }));
  };

  // ── Validation ─────────────────────────────────────
  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.company_name.trim()) e.company_name = 'Company name is required';
    if (!form.industry) e.industry = 'Select your line of business';
    if (!form.address_line1.trim()) e.address_line1 = 'Street address is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) {
      e.state = 'Required';
    } else if (!US_STATES.has(form.state.toUpperCase())) {
      e.state = 'Invalid state';
    }
    if (!form.zip_code.trim()) {
      e.zip_code = 'Required';
    } else if (!/^\d{5}(-\d{4})?$/.test(form.zip_code)) {
      e.zip_code = '5-digit ZIP';
    }
    if (!form.phone.trim()) {
      e.phone = 'Phone is required';
    } else if (!isValidPhone(form.phone)) {
      e.phone = 'Enter a 10-digit phone number';
    }
    if (!form.email.trim()) {
      e.email = 'Email is required';
    } else if (!isValidEmail(form.email)) {
      e.email = 'Enter a valid email';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setApiError(null);

      await settingsService.createProfile({
        company_name: form.company_name,
        industry: form.industry as Industry,
        phone: form.phone,
        email: form.email,
      });

      await settingsService.updateAddress({
        address_line1: form.address_line1,
        city: form.city,
        state: form.state.toUpperCase(),
        zip_code: form.zip_code,
        country: 'US',
      });

      await settingsService.completeOnboarding(3, true);
      onComplete();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail?.includes('already exists')) {
        try {
          await settingsService.updateProfile({
            company_name: form.company_name,
            industry: form.industry as Industry,
            phone: form.phone,
            email: form.email,
          });
          await settingsService.updateAddress({
            address_line1: form.address_line1,
            city: form.city,
            state: form.state.toUpperCase(),
            zip_code: form.zip_code,
            country: 'US',
          });
          await settingsService.completeOnboarding(3, true);
          onComplete();
          return;
        } catch (retryErr: any) {
          setApiError(retryErr?.response?.data?.detail || 'Failed to save. Please try again.');
        }
      } else {
        setApiError(detail || 'Failed to save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Field helpers ──────────────────────────────────
  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
      errors[field]
        ? 'border-red-300 bg-red-50/50 focus:border-red-400'
        : 'border-gray-200 bg-white focus:border-blue-400'
    }`;
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';
  const errorCls = 'text-xs text-red-500 mt-1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20 mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Contractor MS</h1>
          <p className="text-sm text-gray-500 mt-2">Let's set up your business profile to get started</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Section: Company */}
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-900">Company</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Company Name *</label>
                <input className={inputCls('company_name')} value={form.company_name} onChange={set('company_name')} placeholder="Your company name" autoFocus />
                {errors.company_name && <p className={errorCls}>{errors.company_name}</p>}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Line of Business *</label>
                <select className={inputCls('industry')} value={form.industry} onChange={set('industry')}>
                  <option value="">Select your industry...</option>
                  {Object.entries(INDUSTRY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                {errors.industry && <p className={errorCls}>{errors.industry}</p>}
              </div>
            </div>
          </div>

          {/* Section: Address */}
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-900">Primary Address</h2>
              {places.loaded && (
                <span className="text-[9px] text-emerald-600 font-medium ml-1">Powered by Google</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 relative">
                <label className={labelCls}>Street Address *</label>
                <input
                  ref={addressInputRef}
                  className={inputCls('address_line1')}
                  value={form.address_line1}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => { if (places.suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Start typing an address..."
                />
                {errors.address_line1 && <p className={errorCls}>{errors.address_line1}</p>}

                {places.loading && (
                  <div className="absolute right-3 top-8">
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  </div>
                )}

                {showSuggestions && places.suggestions.length > 0 && (
                  <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-56 overflow-y-auto">
                    <div className="px-3 py-1.5 border-b border-gray-50 bg-gray-50/50">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Address Suggestions</span>
                    </div>
                    {places.suggestions.map((s) => (
                      <button key={s.place_id} onClick={() => handlePlaceSelect(s)} className="flex items-center gap-3 w-full px-3 py-2.5 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">{s.main_text}</div>
                          <div className="text-xs text-gray-500 truncate">{s.secondary_text}</div>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 uppercase">New</span>
                      </button>
                    ))}
                    <div className="px-3 py-1 text-right">
                      <span className="text-[9px] text-gray-300">Powered by Google</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>City *</label>
                <input className={inputCls('city')} value={form.city} onChange={set('city')} placeholder="Bridgeport" />
                {errors.city && <p className={errorCls}>{errors.city}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>State *</label>
                  <input
                    className={inputCls('state')}
                    value={form.state}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().slice(0, 2);
                      setForm(prev => ({ ...prev, state: val }));
                      if (errors.state) setErrors(prev => ({ ...prev, state: '' }));
                    }}
                    placeholder="CT"
                    maxLength={2}
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.state && <p className={errorCls}>{errors.state}</p>}
                </div>
                <div>
                  <label className={labelCls}>ZIP *</label>
                  <input
                    className={inputCls('zip_code')}
                    value={form.zip_code}
                    onChange={(e) => {
                      const formatted = formatZip(e.target.value);
                      setForm(prev => ({ ...prev, zip_code: formatted }));
                      if (errors.zip_code) setErrors(prev => ({ ...prev, zip_code: '' }));
                    }}
                    placeholder="06604"
                    maxLength={10}
                  />
                  {errors.zip_code && <p className={errorCls}>{errors.zip_code}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Contact */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-900">Contact</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className={`${inputCls('phone')} pl-9`}
                    value={form.phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setForm(prev => ({ ...prev, phone: formatted }));
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                    }}
                    placeholder="(203) 555-4040"
                    maxLength={14}
                  />
                </div>
                {errors.phone && <p className={errorCls}>{errors.phone}</p>}
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className={`${inputCls('email')} pl-9`}
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    onBlur={() => {
                      if (form.email && !isValidEmail(form.email)) {
                        setErrors(prev => ({ ...prev, email: 'Enter a valid email' }));
                      }
                    }}
                    placeholder="info@company.com"
                  />
                </div>
                {errors.email && <p className={errorCls}>{errors.email}</p>}
              </div>
            </div>
          </div>

          {apiError && (
            <div className="mx-6 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Setting up your account...</>
              ) : (
                <>Get Started<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">You can update these details anytime in Settings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
