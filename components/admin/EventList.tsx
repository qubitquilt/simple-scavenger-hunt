"use client";

import { useState, useEffect } from "react";
import { Event } from "@prisma/client";
import EventListItem from "./EventListItem";

const EventList = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is a placeholder for fetching data from the API
    // In a real application, you would fetch this data from your backend
    const mockEvents: Event[] = [
      { id: "1", title: "MoPOP Launch Party", description: "The inaugural scavenger hunt at the Museum of Pop Culture.", slug: "mopop-launch-party", createdAt: new Date(), updatedAt: new Date(), theme: "blue" },
      { id: "2", title: "Seattle waterfront Hunt", description: "A scenic hunt along the beautiful Seattle waterfront.", slug: "seattle-waterfront-hunt", createdAt: new Date(), updatedAt: new Date(), theme: "green" },
      { id: "3", title: "Spooky Seattle Ghost Tour", description: "A haunted scavenger hunt through Seattle's most historic and spooky sites.", slug: "spooky-seattle-ghost-tour", createdAt: new Date(), updatedAt: new Date(), theme: "red" },
    ];
    setEvents(mockEvents);
    setLoading(false);
  }, []);

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
    <div className="space-y-4">
      {events.map((event) => (
        <EventListItem
          key={event.id}
          event={event}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />
      ))}
    </div>
  );
};

export default EventList;