"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { QuestionType } from "@/types/question";
import { FC } from "react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.nativeEnum(QuestionType),
  // Add other fields as needed for different question types
});

type QuestionFormValues = z.infer<typeof formSchema>;

interface QuestionFormProps {
  // Add props for initial data when editing
}

const QuestionForm: FC<QuestionFormProps> = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: QuestionType.TEXT,
    },
  });

  const questionType = watch("type");

  const onSubmit: SubmitHandler<QuestionFormValues> = (data) => {
    console.log(data);
  };

  const renderDynamicFields = () => {
    switch (questionType) {
      case QuestionType.TEXT:
        return (
          <div>
            {/* Placeholder for TEXT specific fields */}
            <label className="label">
              <span className="label-text">Answer Details</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Expected answer for TEXT question"
            ></textarea>
          </div>
        );
      case QuestionType.MULTIPLE_CHOICE:
        return (
          <div>
            {/* Placeholder for MULTIPLE_CHOICE specific fields */}
            <label className="label">
              <span className="label-text">Answer Options</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Option 1"
            />
            <input
              type="text"
              className="input input-bordered w-full mt-2"
              placeholder="Option 2"
            />
          </div>
        );
      case QuestionType.IMAGE:
        return (
          <div>
            {/* Placeholder for IMAGE specific fields */}
            <label className="label">
              <span className="label-text">Image Details</span>
            </label>
            <p>Image-specific form fields will go here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 p-4 bg-base-200 rounded-lg"
    >
      <h2 className="text-2xl font-bold">Add/Edit Question</h2>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Question Title</span>
        </label>
        <input
          type="text"
          {...register("title")}
          className="input input-bordered"
        />
        {errors.title && <p className="text-error">{errors.title.message}</p>}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Question Type</span>
        </label>
        <select {...register("type")} className="select select-bordered">
          <option value={QuestionType.TEXT}>Text</option>
          <option value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</option>
          <option value={QuestionType.IMAGE}>Image</option>
        </select>
      </div>

      {renderDynamicFields()}

      <button type="submit" className="btn btn-primary">
        Save Question
      </button>
    </form>
  );
};

export default QuestionForm;