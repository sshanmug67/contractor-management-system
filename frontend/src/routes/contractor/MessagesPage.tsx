import { MessageSquare } from 'lucide-react';

export function MessagesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">Communicate with contractors</p>
        </div>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-400">Coming soon</p>
        <p className="text-xs text-gray-300 mt-1">Messages will be built here</p>
      </div>
    </div>
  );
}
