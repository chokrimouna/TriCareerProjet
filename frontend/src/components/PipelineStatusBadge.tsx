import React from 'react';
import { AlertCircle, CheckCircle, Clock, Archive } from 'lucide-react';

interface PipelineStatusBadgeProps {
  status: string;
}

export const PipelineStatusBadge: React.FC<PipelineStatusBadgeProps> = ({ status }) => {
  const normalized = status?.toLowerCase() || 'pending';

  let config = {
    color: 'bg-gray-100 text-gray-700',
    icon: <Clock className="w-4 h-4" />,
    label: 'En attente'
  };

  switch (normalized) {
    case 'awaiting_review':
      config = {
        color: 'bg-blue-100 text-blue-700',
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'À évaluer'
      };
      break;
    case 'archived':
      config = {
        color: 'bg-red-100 text-red-700',
        icon: <Archive className="w-4 h-4" />,
        label: 'Archivé'
      };
      break;
    case 'accepted':
      config = {
        color: 'bg-green-100 text-green-700',
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Accepté'
      };
      break;
    case 'in_progress':
      config = {
        color: 'bg-yellow-100 text-yellow-700',
        icon: <Clock className="w-4 h-4" />,
        label: 'En cours'
      };
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};
