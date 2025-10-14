jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data) => ({ ...data, json: () => Promise.resolve(data) })),
  },
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method || 'GET',
    json: jest.fn().mockResolvedValue(options?.body ? JSON.parse(options.body) : {}),
  })),
}));

import { NextResponse } from "next/server";

import * as server from "next/server";

jest.spyOn(server.NextResponse, "json").mockImplementation((data: any) => ({
  ...data,
  json: () => Promise.resolve(data),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake_key";
});

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));

import { GET, POST, PUT, DELETE } from "@/app/api/admin/events/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

describe("admin events api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET returns events", async () => {
    const mockEvent = {
      id: "1",
      title: "E",
      slug: "e",
      description: "",
      date: "2025-10-14T12:56:22.749Z",
      createdAt: "2025-10-14T12:56:22.749Z",
    };
    (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent]);
    const res = await GET();
    const body = await res.json();
    expect(body.events).toEqual([
      {
        id: "1",
        title: "E",
        slug: "e",
        description: "",
        date: "2025-10-14T12:56:22.749Z",
        createdAt: "2025-10-14T12:56:22.749Z",
      },
    ]);
  });

  it("POST returns 401 when not admin", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { admin: false } });
    const req = new NextRequest("http://localhost/api/admin/events", {
      method: "POST",
      body: JSON.stringify({ title: "t", slug: "test-slug" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.error).toEqual("Unauthorized");
  });

  it("POST returns 400 when name missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { admin: true } });
    const req = new NextRequest("http://localhost/api/admin/events", {
      method: "POST",
      body: JSON.stringify({ title: "", slug: "test-slug" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.error).toEqual("Title is required");
  });

  it("PUT returns 400 when id missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { admin: true } });
    const req = new NextRequest("http://localhost/api/admin/events", {
      method: "PUT",
      body: JSON.stringify({ title: "t", slug: "test-slug" }),
    });
    const res = await PUT(req);
    const body = await res.json();
    expect(body.error).toEqual("ID is required");
  });

  it("DELETE returns 400 when id missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { admin: true } });
    const req = new NextRequest("http://localhost/api/admin/events", {
      method: "DELETE",
      body: JSON.stringify({ title: "t", slug: "test-slug" }),
    });
    const res = await DELETE(req);
    const body = await res.json();
    expect(body.error).toEqual("ID is required");
  });
});
