import React from 'react';
import { Event } from '@/types/admin';

interface EventsPanelProps {
  events: Event[];
}

const EventsPanel: React.FC<EventsPanelProps> = ({ events }) => {
  return (
    <div className="p-4 border rounded-lg mt-4">
      <h2 className="text-2xl font-bold">Events</h2>
      <ul>
        {events.map((event) => (
          <li key={event.id}>{event.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default EventsPanel;