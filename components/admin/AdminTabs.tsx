'use client';

import React, { useState } from 'react';

type AdminTab = 'Metrics' | 'Events' | 'Questions' | 'Users';

interface AdminTabsProps {
  onTabChange: (tab: AdminTab) => void;
}

const AdminTabs: React.FC<AdminTabsProps> = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('Metrics');

  const handleTabClick = (tab: AdminTab) => {
    setActiveTab(tab);
    onTabChange(tab);
  };

  return (
    <div role="tablist" className="tabs tabs-bordered">
      {(['Metrics', 'Events', 'Questions', 'Users'] as AdminTab[]).map((tab) => (
        <a
          key={tab}
          role="tab"
          className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
          onClick={() => handleTabClick(tab)}
          onKeyDown={(e) => e.key === 'Enter' && handleTabClick(tab)}
          tabIndex={0}
        >
          {tab}
        </a>
      ))}
    </div>
  );
};

export default AdminTabs;