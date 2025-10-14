import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import RegisterPage from "@/app/register/page";
import ChallengesPage from "@/app/challenges/page";
import { getUserId } from "@/utils/session";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => null,
  }),
}));

// Mock utils
jest.mock("@/utils/session", () => ({
  getUserId: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe("User Flow Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserId as jest.Mock).mockReturnValue(null);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ userId: "test-user" }),
    });
  });

  describe("Registration", () => {
    it("renders registration form and submits successfully", async () => {
      render(<RegisterPage />);

      expect(
        screen.getByTestId("registration-form-name-input"),
      ).toBeInTheDocument();

      fireEvent.change(screen.getByTestId(/registration-form-name-input/), {
        target: { value: "John Doe" },
      });

      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/register",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ name: "John Doe", eventId: null }),
          }),
        );
      });

      expect(mockPush).toHaveBeenCalledWith("/challenges");
    });

    it("shows error on submission failure", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Registration failed" }),
      });

      render(<RegisterPage />);

      fireEvent.change(screen.getByTestId(/registration-form-name-input/), {
        target: { value: "John Doe" },
      });

      fireEvent.click(screen.getByRole("button", { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Registration failed",
        );
      });
    });
  });

  describe("Challenges", () => {
    beforeEach(() => {
      (getUserId as jest.Mock).mockReturnValue("test-user");
    });

    it("renders challenges list after successful fetch", async () => {
      const mockData = {
        progress: { completed: false },
        questions: [
          { id: "1", type: "text", content: "Test question", answered: false },
        ],
        stats: { completedCount: 0, totalCount: 1 },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      render(<ChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText("Test question")).toBeInTheDocument();
      });

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByText("0 of 1")).toBeInTheDocument();
    });

    it("redirects to register if no userId", () => {
      (getUserId as jest.Mock).mockReturnValue(null);

      render(<ChallengesPage />);

      expect(mockPush).toHaveBeenCalledWith("/register");
    });

    it("shows error on fetch failure", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      render(<ChallengesPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /retry/i }),
        ).toBeInTheDocument();
      });
    });

    it("redirects to complete if progress completed", async () => {
      const mockData = {
        progress: { completed: true },
        questions: [],
        stats: { completedCount: 1, totalCount: 1 },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      render(<ChallengesPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/complete");
      });
    });
  });
});
