import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api/client";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { VerifyEmailPage } from "./VerifyEmailPage";

vi.mock("../../lib/api/client", () => ({
  api: {
    verifyEmail: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
  sessionStore: { getToken: () => null },
}));
vi.mock("../../app/auth-provider", () => ({
  useAuth: () => ({ token: null, refreshUser: vi.fn() }),
}));

function renderPage(element: ReactNode) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

describe("account email flows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks the API for a password reset without exposing account existence", async () => {
    vi.mocked(api.forgotPassword).mockResolvedValue({ status: "ok", message: "Bu e-posta adresi kayıtlıysa bağlantı gönderildi." });
    renderPage(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("E-posta adresi"), { target: { value: "learner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Sıfırlama bağlantısı gönder" }));
    await waitFor(() => expect(api.forgotPassword).toHaveBeenCalledWith("learner@example.com"));
    expect(await screen.findByRole("status")).toHaveTextContent("kayıtlıysa");
  });

  it("does not consume an email verification token until the user confirms", async () => {
    window.history.replaceState({}, "", "/verify-email?token=" + "a".repeat(64));
    vi.mocked(api.verifyEmail).mockResolvedValue({ status: "verified", message: "E-posta adresiniz doğrulandı." });
    renderPage(<VerifyEmailPage />);
    expect(api.verifyEmail).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "E-postamı doğrula" }));
    await waitFor(() => expect(api.verifyEmail).toHaveBeenCalledWith("a".repeat(64)));
    expect(await screen.findByText("E-posta adresiniz doğrulandı.")).toBeInTheDocument();
  });

  it("requires matching strong passwords before sending a reset request", async () => {
    window.history.replaceState({}, "", "/reset-password?token=" + "b".repeat(64));
    renderPage(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText("Yeni şifre", { selector: "input" }), { target: { value: "a-very-strong-password" } });
    fireEvent.change(screen.getByLabelText("Yeni şifre (tekrar)", { selector: "input" }), { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Şifremi güncelle" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Şifreler eşleşmiyor");
    expect(api.resetPassword).not.toHaveBeenCalled();
  });
});
