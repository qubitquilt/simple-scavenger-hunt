"use client";

import React from "react";
import { Event } from "@/types/admin";
import EventListItem from "./EventListItem";

interface EventListProps {
  events: Event[];
}

const EventList: React.FC<EventListProps> = ({ events }) => {

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
            <EventListItem
              key={event.id}
              event={event}
              onView={handleViewEvent}
              onEdit={handleEditEvent}
              onDelete={handleDeleteEvent}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EventList;
