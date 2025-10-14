import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ImageQuestionForm from "@/components/admin/ImageQuestionForm";

const mockOnSubmit = jest.fn();
const user = userEvent.setup();

describe("ImageQuestionForm", () => {
  const defaultProps = {
    initialData: undefined,
    onSubmit: mockOnSubmit,
    eventId: "test-event",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form inputs with defaults", () => {
    render(<ImageQuestionForm {...defaultProps} />);

    expect(screen.getByLabelText(/question content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/image description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("submits valid form data", async () => {
    render(<ImageQuestionForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/question content/i), "Test content");
    await user.type(
      screen.getByLabelText(/image description/i),
      "Upload image of a cat",
    );
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "image",
          content: "Test content",
          imageDescription: "Upload image of a cat",
          allowedFormats: ["jpg", "png"],
          aiThreshold: 8,
          hintEnabled: false,
        }),
        expect.anything(),
      );
    });
  });

  it("handles cancel with unsaved changes confirmation", async () => {
    const mockOnCancel = jest.fn();
    const mockConfirm = jest.fn(() => false);
    global.confirm = mockConfirm;

    render(<ImageQuestionForm {...defaultProps} onCancel={mockOnCancel} />);

    // Make dirty by typing
    await user.type(screen.getByLabelText(/image description/i), "Dirty");

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockConfirm).toHaveBeenCalledWith(
      "Unsaved changes will be lost. Discard?",
    );
    expect(mockOnCancel).not.toHaveBeenCalled();

    mockConfirm.mockReturnValueOnce(true);
    await user.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
