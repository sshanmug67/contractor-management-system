import { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  MessageSquare,
  FileText,
  Settings,
  Building2,
  Search,
  Zap,
  MoreHorizontal,
} from 'lucide-react';
import { useAuthStore, switchDevRole } from '@/store/authStore';
import { useBrandingStore, useCompanyName } from '@/store/brandingStore';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/dashboard/contractors', icon: Users, label: 'Contractors' },
  { to: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/dashboard/invoices', icon: FileText, label: 'Invoices' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function OwnerLayout() {
  const { user } = useAuthStore();
  const companyName = useCompanyName();
  const logoUrl = useBrandingStore((s) => s.branding?.logo_url);
  const fetchBranding = useBrandingStore((s) => s.fetchBranding);

  // Fetch branding on first mount (cached in store — only fires once)
  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Update browser tab title with company name
  useEffect(() => {
    document.title = companyName !== 'CMS' ? companyName : 'Contractor MS';
  }, [companyName]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col">
        {/* Logo / Company Identity */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-200">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="w-8 h-8 rounded-lg object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-gray-900 leading-none truncate">
              {companyName}
            </h1>
            <p className="text-[10px] text-gray-400">Management System</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">Search...</span>
            <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">⌘K</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* AI Agent Status */}
        <div className="mx-3 mb-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-semibold text-blue-700">AI Agent Active</span>
          </div>
          <p className="text-[11px] text-blue-600/70 leading-relaxed">Monitoring 8 workgroups across 3 worksites</p>
        </div>

        {/* Dev role switcher */}
        {import.meta.env.DEV && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-[10px] text-gray-400">Dev:</span>
              <button
                onClick={() => switchDevRole('owner')}
                className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium"
              >
                Owner
              </button>
              <button
                onClick={() => {
                  switchDevRole('contractor');
                  window.location.href = '/app';
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium"
              >
                Contractor
              </button>
            </div>
          </div>
        )}

        {/* User info */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-700">
                {user?.name?.charAt(0) || 'T'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-900 truncate">
                {user?.name || 'Tom Wilson'}
              </p>
              <p className="text-[11px] text-gray-400 truncate">{user?.email || 'owner@dev.local'}</p>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
