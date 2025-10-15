import React from 'react';
import { Event } from '@/types/admin';
import EventList from './EventList';

interface EventsPanelProps {
  events: Event[];
}

const EventsPanel: React.FC<EventsPanelProps> = ({ events }) => {
  return (
    <div className="p-4 border rounded-lg mt-4">
      <h2 className="text-2xl font-bold">Events</h2>
      <EventList events={events} />
    </div>
  );
};

export default EventsPanel;