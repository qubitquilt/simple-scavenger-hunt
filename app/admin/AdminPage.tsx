'use client';

import React, { useState } from 'react';
import { AdminTab } from '@/components/admin/AdminTabs';
import { useAdminData } from '@/lib/admin-hooks';
import EventsPanel from '@/components/admin/EventsPanel';
import QuestionsPanel from '@/components/admin/QuestionsPanel';
import UsersPanel from '@/components/admin/UsersPanel';
import MetricsPanel from '@/components/admin/MetricsPanel';
import LoadingSpinner from '@/components/LoadingSpinner';
import AdminTabs from '@/components/admin/AdminTabs';

const AdminPage: React.FC = () => {
    const { events, questions, users, loading, error } = useAdminData();
    const [activeTab, setActiveTab] = useState<AdminTab>('Metrics');

    const handleTabChange = (tab: AdminTab) => {
        setActiveTab(tab);
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <p>Error: {error.message}</p>;
    }

    return (
        <div>
            <AdminTabs onTabChange={handleTabChange} />
            {activeTab === 'Metrics' && <MetricsPanel />}
            {activeTab === 'Events' && <EventsPanel events={events} />}
            {activeTab === 'Questions' && <QuestionsPanel questions={questions} />}
            {activeTab === 'Users' && <UsersPanel users={users} />}
        </div>
    );
};

export default AdminPage;
