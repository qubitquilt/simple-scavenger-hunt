import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    answer: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    progress: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    question: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock OpenRouter / AI fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockPrisma = jest.requireMock("@/lib/prisma").prisma;

// Mock next-auth getServerSession
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession =
  jest.requireMock("next-auth/next").getServerSession;

describe("API progress completion logic", () => {
  const userCookie = { value: "user-1" };

  const makeReq = (body: any) => ({
    json: async () => body,
    headers: {
      get: jest.fn(() => "application/json"),
    },
    cookies: {
      get: jest.fn(() => userCookie),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "fake_key";
    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } });

    // Default question and progress used by tests
    mockPrisma.progress.findFirst.mockResolvedValue({
      id: "p1",
      eventId: "e1",
    });
    mockPrisma.question.findFirst.mockResolvedValue({
      id: "q1",
      type: "text",
      expectedAnswer: "expected",
      aiThreshold: 5,
      content: "Question text",
    });

    // Default: use tx as the same mocked prisma object
    mockPrisma.$transaction = jest.fn((fn) => fn(mockPrisma));
  });

  it("incremental progress: submitting 1 of 3 correctly sets completed false and stats reflect 1/3", async () => {
    const { POST } = await import("@/app/api/answers/route");
    // Simulate AI returning a high score -> accepted
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: "Score: 9\n\nExplanation: Good match" } },
        ],
      }),
    });

    // No existing answer
    mockPrisma.answer.findFirst.mockResolvedValue(null);
    mockPrisma.answer.create.mockResolvedValue({ id: "a1" });

    // When transaction reads answers, only 1 accepted recorded
    mockPrisma.answer.findMany.mockResolvedValue([{ status: "correct" }]);

    // progress row inside tx contains questionOrder of 3
    mockPrisma.progress.findUnique.mockResolvedValue({
      id: "p1",
      questionOrder: ["q1", "q2", "q3"],
      eventId: "e1",
    });

    const req = makeReq({
      questionId: "q1",
      submission: "user answer",
    }) as any as NextRequest;
    const res = await POST(req);

    expect(res).toMatchObject({
      accepted: true,
      status: "accepted",
    });
    // Progress update should not have been called because not complete
    expect(mockPrisma.progress.update).not.toHaveBeenCalled();
  });

  it("final completion: after submitting all 3 questions correctly, progress.completed becomes true", async () => {
    const { POST } = await import("@/app/api/answers/route");
    // Prepare three sequential submissions: simulate calling POST three times.
    // We'll simulate the third call here (assume prior two have created accepted answers).

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: "Score: 9\n\nExplanation: Good match" } },
        ],
      }),
    });

    // No existing answer for this submission
    mockPrisma.answer.findFirst.mockResolvedValue(null);
    // Create returns an id
    mockPrisma.answer.create.mockResolvedValue({ id: "a3" });

    // Transaction read returns 3 accepted answers (after this insert)
    mockPrisma.answer.findMany.mockResolvedValue([
      { status: "correct" },
      { status: "correct" },
      { status: "correct" },
    ]);

    mockPrisma.progress.findUnique.mockResolvedValue({
      id: "p1",
      questionOrder: ["q1", "q2", "q3"],
      eventId: "e1",
    });

    mockPrisma.progress.update.mockResolvedValue({ id: "p1", completed: true });

    const req = makeReq({
      questionId: "q3",
      submission: "final answer",
    }) as any as NextRequest;
    const res = await POST(req);

    expect(res).toMatchObject({
      accepted: true,
      status: "accepted",
    });
    expect(mockPrisma.progress.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { completed: true },
    });
  });

  it("edge case: submitting incorrect answers should not mark completion", async () => {
    const { POST } = await import("@/app/api/answers/route");
    // AI returns low score -> rejected
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: "Score: 2\n\nExplanation: Not a match" } },
        ],
      }),
    });

    mockPrisma.answer.findFirst.mockResolvedValue(null);
    mockPrisma.answer.create.mockResolvedValue({ id: "aX" });

    // After this insert, only 0 accepted answers
    mockPrisma.answer.findMany.mockResolvedValue([{ status: "incorrect" }]);
    mockPrisma.progress.findUnique.mockResolvedValue({
      id: "p1",
      questionOrder: ["q1", "q2", "q3"],
      eventId: "e1",
    });

    const req = makeReq({
      questionId: "qX",
      submission: "wrong answer",
    }) as any as NextRequest;
    const res = await POST(req);

    expect(res).toMatchObject({
      accepted: false,
      status: "rejected",
    });
    expect(mockPrisma.progress.update).not.toHaveBeenCalled();
  });

  it("edge case: duplicate submissions update existing answer and do not cause incorrect completion", async () => {
    const { POST } = await import("@/app/api/answers/route");
    // Simulate existing answer present (duplicate)
    mockPrisma.answer.findFirst.mockResolvedValue({
      id: "existingA",
      status: "incorrect",
    });
    // Update will be called on tx.answer.update; here we mock update result
    mockPrisma.answer.update.mockResolvedValue({ id: "existingA" });

    // AI returns an accepted score now
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: "Score: 8\n\nExplanation: Now correct" } },
        ],
      }),
    });

    // After updating, suppose there are still only 2 accepted out of 3
    mockPrisma.answer.findMany.mockResolvedValue([
      { status: "correct" },
      { status: "correct" },
    ]);
    mockPrisma.progress.findUnique.mockResolvedValue({
      id: "p1",
      questionOrder: ["q1", "q2", "q3"],
      eventId: "e1",
    });

    const req = makeReq({
      questionId: "q2",
      submission: "updated submission",
    }) as any as NextRequest;
    const res = await POST(req);

    expect(mockPrisma.answer.update).toHaveBeenCalled();
    expect(res).toMatchObject({
      accepted: true,
      status: "accepted",
    });
    expect(mockPrisma.progress.update).not.toHaveBeenCalled();
  });
});
