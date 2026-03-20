import { useState, useEffect } from 'react';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import { settingsService } from '../services/settingsService';
import type { OnboardingStatus } from '../types/settings';

/**
 * OnboardingBanner
 *
 * Shows a dismissible amber banner on the dashboard when
 * optional profile fields are missing (EIN, website, billing, etc.).
 * Only shown after mandatory onboarding is complete.
 *
 * Usage: Drop into OwnerDashboard.tsx above the main content.
 *   <OnboardingBanner />
 */
export function OnboardingBanner() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if previously dismissed this session
    const wasDismissed = sessionStorage.getItem('onboarding_banner_dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    settingsService.getOnboardingStatus()
      .then(data => {
        setStatus(data);
        // Show banner if onboarding is done but profile could be more complete
        if (data.onboarding_complete && data.missing_fields.length > 0) {
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('onboarding_banner_dismissed', 'true');
  };

  if (dismissed || !visible || !status) return null;

  return (
    <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 animate-in fade-in duration-300">
      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">
          Your business profile is missing some details
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Add your EIN, website, and billing preferences for a complete setup.
        </p>
      </div>
      <a
        href="/dashboard/settings"
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors"
      >
        Complete
        <ArrowRight className="w-3.5 h-3.5" />
      </a>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-md text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
