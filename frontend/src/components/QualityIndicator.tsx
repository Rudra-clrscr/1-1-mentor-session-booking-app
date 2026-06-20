'use client';

import { ConnectionQuality } from '@/lib/network-monitor';
import { useState } from 'react';

interface QualityIndicatorProps {
  quality: ConnectionQuality['quality'];
  isVisible: boolean;
  className?: string;
}

export default function QualityIndicator({ quality, isVisible, className = '' }: QualityIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isVisible) return null;

  const qualityConfig = {
    good: { 
      color: 'green', 
      label: 'Excellent', 
      icon: '📶',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-400',
      borderColor: 'border-green-500'
    },
    fair: { 
      color: 'yellow', 
      label: 'Good', 
      icon: '📶',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      borderColor: 'border-yellow-500'
    },
    poor: { 
      color: 'orange', 
      label: 'Fair', 
      icon: '📶',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-700 dark:text-orange-400',
      borderColor: 'border-orange-500'
    },
    bad: { 
      color: 'red', 
      label: 'Poor', 
      icon: '⚠️',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-500'
    }
  };

  const config = qualityConfig[quality];

  return (
    <div 
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="text-base">{config.icon}</span>
      <span>{config.label}</span>
      
      {showTooltip && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full z-50 px-3 py-1.5 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap">
          {quality === 'good' && 'High quality video'}
          {quality === 'fair' && 'Good quality'}
          {quality === 'poor' && 'Reducing quality due to network'}
          {quality === 'bad' && 'Audio-only mode - Poor connection'}
        </div>
      )}
    </div>
  );
}