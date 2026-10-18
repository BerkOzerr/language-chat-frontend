import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LandingPage } from "./LandingPage";

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => vi.fn()
}));
vi.mock("../../app/auth-provider", () => ({ useAuth: () => ({ signIn: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({ useMutation: () => ({ mutate: vi.fn(), isPending: false }) }));

describe("LandingPage", () => {
  it("shows primary guest action and registration navigation", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /dil pratiği/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /misafir olarak başla/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ücretsiz hesap oluştur/i })).toHaveAttribute("href", "/register");
  });
});