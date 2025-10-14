"use client";

import { Event } from "@/types/admin";

interface EventListItemProps {
  event: Event;
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}

const EventListItem = ({ event, onView, onEdit, onDelete }: EventListItemProps) => {
  const handleView = () => {
    console.log("Viewing event:", event);
    onView(event);
  };

  const handleEdit = () => {
    console.log("Editing event:", event);
    onEdit(event);
  };

  const handleDelete = () => {
    console.log("Deleting event:", event);
    onDelete(event);
  };

  return (
    <tr>
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
            onClick={handleView}
            className="btn btn-sm btn-info join-item"
            aria-label={`View ${event.title}`}
          >
            View
          </button>
          <button
            onClick={handleEdit}
            className="btn btn-sm btn-warning join-item"
            aria-label={`Edit ${event.title}`}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-sm btn-error join-item"
            aria-label={`Delete ${event.title}`}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export default EventListItem;
