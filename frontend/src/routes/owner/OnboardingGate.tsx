import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import type { OnboardingStatus } from '../../types/settings';
import { OnboardingWizard } from './OnboardingWizard';

interface Props {
  children: React.ReactNode;
}

/**
 * OnboardingGate
 *
 * Wraps the OwnerLayout (or any protected content).
 * If the business profile doesn't exist or onboarding is incomplete,
 * shows the OnboardingWizard instead of the dashboard.
 *
 * Usage in App.tsx:
 *   <OnboardingGate>
 *     <OwnerLayout />
 *   </OnboardingGate>
 */
export function OnboardingGate({ children }: Props) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const checkOnboarding = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getOnboardingStatus();
      setStatus(data);
      setShowWizard(!data.onboarding_complete);
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
      // If the check fails, let them through (don't block on error)
      setShowWizard(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkOnboarding();
  }, []);

  const handleWizardComplete = () => {
    setShowWizard(false);
    // Re-check status to update the banner context
    checkOnboarding();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (showWizard) {
    return <OnboardingWizard onComplete={handleWizardComplete} />;
  }

  return <>{children}</>;
}
