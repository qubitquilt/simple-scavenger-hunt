// Mock validation
jest.mock("@/lib/validation", () => ({
  imageUploadSchema: { safeParse: jest.fn(() => ({ success: true })) },
  bufferValidationSchema: { safeParse: jest.fn(() => ({ success: true })) },
}));

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    answer: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    progress: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    question: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock storage
jest.mock("@/lib/storage", () => ({
  __esModule: true,
  default: {
    uploadImage: jest.fn(),
    cleanupImage: jest.fn(),
  },
}));

// Mock fetch for AI
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock fs
jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => Buffer.from("fake image data")),
}));

import { NextRequest } from "next/server";

const mockPrisma = jest.requireMock("@/lib/prisma").prisma;
const mockStorage = jest.requireMock("@/lib/storage").default;

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'userId') {
        return { value: 'user1' };
      }
      return undefined;
    }),
  })),
}));

// Mock next-auth getServerSession
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

const getServerSession = require("next-auth/next").getServerSession;

describe("POST /api/answers for image submission", () => {
  const mockReq = (body: FormData) =>
    ({
      json: async () => ({}),
      formData: async () => body,
      headers: {
        get: jest.fn((name: string) =>
          name === "content-type" ? "multipart/form-data" : null,
        ),
      },
      cookies: {
        get: jest.fn(() => ({ value: "user1" })),
      },
    }) as unknown as NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "test-key";
    getServerSession.mockResolvedValue({ user: { id: "user1" } });
    mockPrisma.question.findFirst.mockResolvedValue({
      id: "q1",
      type: "image",
      eventId: "ev1",
      content: "Test question",
      expectedAnswer: "Expected image description",
      aiThreshold: 5,
      allowedFormats: ["jpg", "png"],
      maxFileSize: 5242880,
      imageDescription: "Test image description",
    });
    mockPrisma.progress.findFirst.mockResolvedValue({
      id: "p1",
      eventId: "ev1",
    });
    mockPrisma.progress.findUnique.mockResolvedValue({
      questionOrder: ["q1"],
      eventId: "ev1",
    });
    mockPrisma.event.findUnique.mockResolvedValue({ slug: "event-slug" });
    mockStorage.uploadImage.mockResolvedValue({ url: "/uploads/image.jpg" });
    mockPrisma.answer.findFirst.mockResolvedValue(null);
    mockPrisma.answer.findMany.mockResolvedValue([{ status: "correct" }]);
    mockPrisma.answer.create.mockResolvedValue({ id: "a1" });
    mockPrisma.progress.update.mockResolvedValue({ id: "p1", completed: true });
    mockPrisma.question.count.mockResolvedValue(1);
    mockPrisma.$transaction = jest.fn().mockImplementation((txFn) => {
      return txFn(mockPrisma);
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: '{"score": 10, "correct": true, "explanation": "correct"}',
              },
            },
          ],
        }),
    } as Response);
  });

  it("submits image answer successfully", async () => {
    const { POST } = await import("@/app/api/answers/route");
    const formData = new FormData();
    const file = new File(["image data"], "test.jpg", { type: "image/jpeg" });
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
    Object.defineProperty(file, "size", { value: 1024, writable: false });
    formData.append("file", file);
    formData.append("questionId", "q1");

    const req = mockReq(formData);

    const res = await POST(req);

    expect(mockStorage.uploadImage).toHaveBeenCalled();
    expect(mockPrisma.answer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          progress: { connect: { id: "p1" } },
          question: { connect: { id: "q1" } },
          submission: { url: "/uploads/image.jpg" },
          aiScore: 10,
          status: "correct",
          explanation: "correct",
        },
        select: { id: true }
      }),
    );
    expect(mockPrisma.progress.update).toHaveBeenCalled();
    expect(res).toEqual({
      accepted: true,
      status: "accepted",
    });
  });

  it("returns 400 for missing file", async () => {
    const { POST } = await import("@/app/api/answers/route");
    const formData = new FormData();
    formData.append("questionId", "q1");

    const req = mockReq(formData);

    const res = await POST(req);

    expect(res).toEqual({
      error: "File and questionId are required for image upload",
    });
    expect(mockStorage.uploadImage).not.toHaveBeenCalled();
  });

  it("returns 404 if question not found", async () => {
    const { POST } = await import("@/app/api/answers/route");
    const formData = new FormData();
    const file = new File(["image data"], "test.jpg", { type: "image/jpeg" });
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
    Object.defineProperty(file, "size", { value: 1024, writable: false });
    formData.append("file", file);
    formData.append("questionId", "q1");

    mockPrisma.question.findFirst.mockResolvedValue(null);

    const req = mockReq(formData);

    const res = await POST(req);

    expect(res).toEqual({ error: "Image question not found" });
  });

  it("returns 500 if upload fails", async () => {
    const { POST } = await import("@/app/api/answers/route");
    const formData = new FormData();
    const file = new File(["image data"], "test.jpg", { type: "image/jpeg" });
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
    Object.defineProperty(file, "size", { value: 1024, writable: false });
    formData.append("file", file);
    formData.append("questionId", "q1");

    mockStorage.uploadImage.mockRejectedValue(new Error("Upload failed"));

    const req = mockReq(formData);

    const res = await POST(req);

    expect(res).toEqual({ error: "Internal server error" });
  });

  it("returns pending status if AI analysis fails", async () => {
    const { POST } = await import("@/app/api/answers/route");
    const formData = new FormData();
    const file = new File(["image data"], "test.jpg", { type: "image/jpeg" });
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));
    Object.defineProperty(file, "size", { value: 1024, writable: false });
    formData.append("file", file);
    formData.append("questionId", "q1");

    mockFetch.mockRejectedValue(new Error("AI error"));

    const req = mockReq(formData);

    const res = await POST(req);

    expect(res).toEqual({
      accepted: false,
      status: "pending"
    });
  });


});
