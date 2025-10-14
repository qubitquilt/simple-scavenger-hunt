"use client";

import { Event } from "@/types/admin";

interface EventListItemProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}

const EventListItem = ({ event, onEdit, onDelete }: EventListItemProps) => {
  const handleEdit = () => {
    console.log("Editing event:", event);
    onEdit(event);
  };

  const handleDelete = () => {
    console.log("Deleting event:", event);
    onDelete(event);
  };

  return (
    <div className="card bg-base-100 shadow-md mb-4">
      <div className="card-body">
        <h2 className="card-title">{event.title}</h2>
        <p>{event.description}</p>
        <div className="card-actions justify-end mt-4">
          <button onClick={handleEdit} className="btn btn-sm btn-outline btn-info">
            Edit
          </button>
          <button onClick={handleDelete} className="btn btn-sm btn-outline btn-error">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventListItem;
