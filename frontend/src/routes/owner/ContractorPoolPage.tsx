import { Users } from 'lucide-react';

export function ContractorPoolPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contractor Pool</h1>
          <p className="text-sm text-gray-500">Browse and manage contractors</p>
        </div>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-400">Coming soon</p>
        <p className="text-xs text-gray-300 mt-1">Contractor Pool will be built here</p>
      </div>
    </div>
  );
}
