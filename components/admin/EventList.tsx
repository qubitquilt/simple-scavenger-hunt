"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types/admin";

const EventList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is a placeholder for fetching data from the API
    // In a real application, you would fetch this data from your backend
    const mockEvents: Event[] = [
      { id: "1", title: "MoPOP Launch Party", description: "The inaugural scavenger hunt at the Museum of Pop Culture.", slug: "mopop-launch-party", createdAt: new Date(), date: new Date(), theme: "blue" },
      { id: "2", title: "Seattle waterfront Hunt", description: "A scenic hunt along the beautiful Seattle waterfront.", slug: "seattle-waterfront-hunt", createdAt: new Date(), date: new Date(), theme: "green" },
      { id: "3", title: "Spooky Seattle Ghost Tour", description: "A haunted scavenger hunt through Seattle's most historic and spooky sites.", slug: "spooky-seattle-ghost-tour", createdAt: new Date(), date: new Date(), theme: "red" },
    ];
    setEvents(mockEvents);
    setLoading(false);
  }, []);

  const handleViewEvent = (event: Event) => {
    console.log("Viewing event in EventList:", event);
    // Placeholder for view functionality
  };

  const handleEditEvent = (event: Event) => {
    console.log("Editing event in EventList:", event);
    // Placeholder for edit functionality
  };

  const handleDeleteEvent = (event: Event) => {
    console.log("Deleting event in EventList:", event);
    // Placeholder for delete functionality
  };

  if (loading) {
    return <div className="text-center p-4">Loading events...</div>;
  }

  if (events.length === 0) {
    return <div className="text-center p-4">No events found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Slug</th>
            <th>Date</th>
            <th>Theme</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{event.title}</td>
              <td className="max-w-xs truncate">{event.description}</td>
              <td>{event.slug}</td>
              <td>{event.date.toLocaleDateString()}</td>
              <td>
                <span className={`badge badge-${event.theme}`}>{event.theme}</span>
              </td>
              <td>
                <div className="join">
                  <button
                    className="btn btn-sm btn-info join-item"
                    onClick={() => handleViewEvent(event)}
                    aria-label={`View ${event.title}`}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-sm btn-warning join-item"
                    onClick={() => handleEditEvent(event)}
                    aria-label={`Edit ${event.title}`}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-error join-item"
                    onClick={() => handleDeleteEvent(event)}
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
  );
};

export default EventList;
