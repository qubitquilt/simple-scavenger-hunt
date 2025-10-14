"use client";

import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageQuestionData } from "@/lib/validation";
import type { Question } from "@/types/question";

interface ImageQuestionFormProps {
  initialData?: Partial<Question>;
  onSubmit: SubmitHandler<ImageQuestionData>;
  onCancel?: () => void;
  eventId: string;
}

export default function ImageQuestionForm({
  initialData,
  onSubmit,
  onCancel,
  eventId,
}: ImageQuestionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<ImageQuestionData>({
    resolver: zodResolver(ImageQuestionData),
    defaultValues: {
      eventId,
      type: "image",
      title: initialData?.title ?? initialData?.content ?? "",
      content: initialData?.content ?? "",
      expectedAnswer: initialData?.expectedAnswer ?? "",
      aiThreshold: initialData?.aiThreshold ?? 8,
      hintEnabled: initialData?.hintEnabled ?? false,
      imageDescription: initialData?.imageDescription ?? "",
      allowedFormats: initialData?.allowedFormats ?? ["jpg", "png"],
      maxFileSize: initialData?.maxFileSize ?? 5242880,
      minResolution: {
        width: initialData?.minResolution?.width ?? 100,
        height: initialData?.minResolution?.height ?? 100,
      },
      required: initialData?.required ?? false,
    },
  });

  const handleCancel = () => {
    if (isDirty && !confirm("Unsaved changes will be lost. Discard?")) {
      return;
    }
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Question Title
        </label>
        <textarea
          id="title"
          {...register("title")}
          rows={2}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-required="true"
        />
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700"
        >
          Question Content
        </label>
        <textarea
          id="content"
          {...register("content")}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-required="true"
        />
      </div>

      <div>
        <label
          htmlFor="imageDescription"
          className="block text-sm font-medium text-gray-700"
        >
          Image Description
        </label>
        <textarea
          id="imageDescription"
          {...register("imageDescription")}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="hintEnabled"
          className="block text-sm font-medium text-gray-700"
        >
          Enable hints
        </label>
        <input
          id="hintEnabled"
          type="checkbox"
          {...register("hintEnabled")}
          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
      <div className="flex space-x-3 pt-4">
        <button type="submit" className="btn btn-primary btn-block">
          Submit
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary btn-block"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
