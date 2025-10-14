'use client';

import React from 'react';
import { useAdminData } from '@/lib/admin-hooks';
import EventsPanel from '@/components/admin/EventsPanel';
import QuestionsPanel from '@/components/admin/QuestionsPanel';
import UsersPanel from '@/components/admin/UsersPanel';
import LoadingSpinner from '@/components/LoadingSpinner';
import AdminTabs from '@/components/admin/AdminTabs';

const AdminPage: React.FC = () => {
    const { events, questions, users, loading, error } = useAdminData();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <p>Error: {error.message}</p>;
    }

    return (
        <AdminTabs
            eventsPanel={<EventsPanel events={events} />}
            questionsPanel={<QuestionsPanel questions={questions} />}
            usersPanel={<UsersPanel users={users} />}
        />
    );
};

export default AdminPage;
