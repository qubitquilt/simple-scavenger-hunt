import { prisma } from "@/lib/prisma";

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => ({ mock: "prisma-client" })),
}));

describe("prisma client", () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("exports prisma client", () => {
    // re-import to apply env
    const mod = require("@/lib/prisma");
    expect(mod.prisma).toBeDefined();
  });
});
