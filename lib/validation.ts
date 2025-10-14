import { z } from "zod";

const commonQuestionFields = {
  eventId: z.string().min(1, "Event ID is required"),
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  content: z.string().min(1, "Content is required").max(2000, "Content must be less than 2000 characters"),
  expectedAnswer: z.string().min(1, "Expected answer is required"),
  aiThreshold: z.coerce.number().min(0).max(10).default(8),
  hintEnabled: z.boolean().default(false),
};

const textQuestionSchema = z.object({
  type: z.literal("text"),
  ...commonQuestionFields,
});

export const multipleChoiceQuestionSchema = z
  .object({
    type: z.literal("multiple_choice"),
    ...commonQuestionFields,
    options: z
      .record(z.enum(["A", "B", "C", "D"]), z.string().min(1))
      .refine((options) => Object.keys(options).length >= 2, {
        message: "At least 2 options required for multiple choice",
      }),
  })
  .superRefine((data, ctx) => {
    if (!Object.keys(data.options).includes(data.expectedAnswer)) {
      ctx.addIssue({
        code: "custom",
        message: "Expected answer must be a valid option key",
        path: ["expectedAnswer"],
      });
    }
  });

export const imageQuestionSchema = z.object({
  type: z.literal("image"),
  ...commonQuestionFields,
  imageDescription: z.string().min(1, "Image description is required"),
  allowedFormats: z.array(z.enum(["jpg", "png", "gif"]))
    .refine((formats) => formats.length >= 1, {
      message: "At least one format required",
    }),
  maxFileSize: z.number()
    .min(1)
    .max(10 * 1024 * 1024, "Number must be less than or equal to 10485760")
    .default(5 * 1024 * 1024),
  minResolution: z.preprocess(
    (val) => (typeof val === "string" ? JSON.parse(val) : val),
    z.object({
      width: z.number().min(1, "Width must be at least 1"),
      height: z.number().min(1, "Height must be at least 1"),
    }),
  ).default({ width: 100, height: 100 }),
  required: z.boolean().default(false),
	});

export const createQuestionSchema = z.discriminatedUnion("type", [
  textQuestionSchema,
  multipleChoiceQuestionSchema,
  imageQuestionSchema,
]);

const updateCommonFields = {
  eventId: z.string().min(1).optional(),
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(2000).optional(),
  expectedAnswer: z.string().min(1).optional(),
  aiThreshold: z.coerce.number().min(0).max(10).default(8).optional(),
  hintEnabled: z.boolean().default(false).optional(),
  imageDescription: z.string().optional(),
  allowedFormats: z.preprocess(
    (val) => (typeof val === "string" ? JSON.parse(val) : val),
    z.array(z.enum(["jpg", "png", "gif"])).optional(),
  ),
};

export const updateQuestionSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(["text", "multiple_choice", "image"]).optional(),
    ...updateCommonFields,
    options: z
      .record(z.enum(["A", "B", "C", "D"]), z.string().min(1))
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "multiple_choice") {
      if (data.options && Object.keys(data.options).length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "At least 2 options required for multiple choice",
        });
      }
      if (
        data.expectedAnswer &&
        data.options &&
        !Object.keys(data.options).includes(data.expectedAnswer)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Expected answer must be a valid option key",
        });
      }
    }
    if (data.type === "image") {
      if (data.imageDescription === "") {
        ctx.addIssue({
          code: "custom",
          message: "Image description is required",
          path: ["imageDescription"],
        });
      }
      if (data.allowedFormats && data.allowedFormats.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "At least one format required",
          path: ["allowedFormats"],
        });
      }
    }
  });

export type CreateQuestion = z.infer<typeof createQuestionSchema>;
export type UpdateQuestion = z.infer<typeof updateQuestionSchema>;
export const ImageQuestionData = imageQuestionSchema;
export type ImageQuestionData = z.infer<typeof imageQuestionSchema>;

export const imageUploadSchema = z.object({
  file: z.instanceof(File),
  questionId: z.string().min(1),
});

export const bufferValidationSchema = z
  .object({
    buffer: z.instanceof(Buffer),
    mimeType: z.string(),
    size: z.number(),
    allowedFormats: z.array(z.string()),
    maxFileSize: z.number(),
  })
  .refine((data) => data.allowedFormats.includes(data.mimeType), {
    message: "Invalid file format",
    path: ["mimeType"],
  })
  .refine((data) => data.size <= data.maxFileSize, {
    message: "File too large",
    path: ["size"],
  });

export type ImageUpload = z.infer<typeof imageUploadSchema>;

export const userRegistrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  eventId: z.string().optional(),
});

export type UserRegistration = z.infer<typeof userRegistrationSchema>;
