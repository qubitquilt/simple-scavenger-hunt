jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
    progress: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const { POST: registerPOST } = require("@/app/api/register/route");

describe("POST /api/register", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://fake.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake_key";
  });

  it("returns 400 when missing names", async () => {
    const req = { json: async () => ({ name: "" }) };

    const res = await registerPOST(req);
    expect(res).toEqual({ error: "name is required" });
  });

  it("returns 404 when no events found", async () => {
    const { prisma: registerPrisma } = require("@/lib/prisma");
    registerPrisma.user.findFirst.mockResolvedValue(null);
    registerPrisma.user.create.mockResolvedValue({ id: "u1" });
    registerPrisma.event.findFirst.mockResolvedValue(null);
    const req = { json: async () => ({ name: "A B" }) };
    const res = await registerPOST(req);
    expect(res).toEqual({ error: "No events found" });
  });
});
