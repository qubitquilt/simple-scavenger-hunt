"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Event } from "@prisma/client";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
  event?: Event;
  onSubmit: SubmitHandler<EventFormValues>;
}

const EventForm = ({ event, onSubmit }: EventFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      slug: event?.slug || "",
    },
  });

  const handleFormSubmit: SubmitHandler<EventFormValues> = (data) => {
    console.log("Form data submitted:", data);
    onSubmit(data);
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="card bg-base-200 shadow-xl"
    >
      <div className="card-body gap-4">
        <h2 className="card-title">{event ? "Edit Event" : "Create Event"}</h2>
        
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Title</span>
          </div>
          <input
            type="text"
            placeholder="Event Title"
            className="input input-bordered w-full"
            {...register("title")}
          />
          {errors.title && <p className="text-error mt-1">{errors.title.message}</p>}
        </label>
        
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Description</span>
          </div>
          <textarea
            className="textarea textarea-bordered h-24 w-full"
            placeholder="Event Description"
            {...register("description")}
          ></textarea>
          {errors.description && <p className="text-error mt-1">{errors.description.message}</p>}
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Slug</span>
          </div>
          <input
            type="text"
            placeholder="event-slug"
            className="input input-bordered w-full"
            {...register("slug")}
          />
          {errors.slug && <p className="text-error mt-1">{errors.slug.message}</p>}
        </label>

        <div className="card-actions justify-end mt-4">
          <button type="submit" className="btn btn-primary">
            {event ? "Update Event" : "Create Event"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default EventForm;