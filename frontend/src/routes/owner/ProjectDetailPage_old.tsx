import { useParams } from 'react-router-dom';

export function ProjectDetailPage() {
  const { projectId } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Project Detail</h1>
      <p className="text-sm text-gray-500">Project ID: {projectId}</p>
      <div className="card mt-4">
        <p className="text-sm text-gray-500">Workgroups, Gantt timeline, budget breakdown, and AI insights will be rendered here.</p>
      </div>
    </div>
  );
}
