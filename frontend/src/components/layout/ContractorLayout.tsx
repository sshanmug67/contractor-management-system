import { Outlet, NavLink } from 'react-router-dom';
import {
  FolderKanban,
  MessageSquare,
  FileText,
  User,
  HardHat,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import { useAuthStore, switchDevRole } from '@/store/authStore';

const navItems = [
  { to: '/app', icon: FolderKanban, label: 'My Workgroups', end: true },
  { to: '/app/invoices', icon: FileText, label: 'Invoices' },
  { to: '/app/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/app/profile', icon: User, label: 'Profile' },
];

export function ContractorLayout() {
  const { user } = useAuthStore();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-200">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <HardHat className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Contractor MS</h1>
            <p className="text-[10px] text-gray-400">Contractor Portal</p>
          </div>
        </div>

        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">Search...</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {import.meta.env.DEV && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-[10px] text-gray-400">Dev:</span>
              <button
                onClick={() => {
                  switchDevRole('owner');
                  window.location.href = '/dashboard';
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium"
              >
                Owner
              </button>
              <button
                onClick={() => switchDevRole('contractor')}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium"
              >
                Contractor
              </button>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-700">
                {user?.name?.charAt(0) || 'C'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-900 truncate">
                {user?.name || 'Dev Contractor'}
              </p>
              <p className="text-[11px] text-gray-400 truncate">{user?.email || 'contractor@dev.local'}</p>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
