import React from 'react';
import { Event } from '@/types/admin';

interface EventsPanelProps {
  events: Event[];
}

const EventsPanel: React.FC<EventsPanelProps> = ({ events }) => {
  return (
    <div className="p-4 border rounded-lg mt-4">
      <h2 className="text-2xl font-bold">Events</h2>
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.title}</td>
                <td className="max-w-xs truncate">{event.description}</td>
                <td>
                  <span className={`badge badge-${event.theme}`}>{event.theme}</span>
                </td>
                <td>
                  <div className="join">
                    <button
                      className="btn btn-sm btn-info join-item"
                      onClick={() => console.log("Viewing event:", event)}
                      aria-label={`View ${event.title}`}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-sm btn-warning join-item"
                      onClick={() => console.log("Editing event:", event)}
                      aria-label={`Edit ${event.title}`}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-error join-item"
                      onClick={() => console.log("Deleting event:", event)}
                      aria-label={`Delete ${event.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventsPanel;