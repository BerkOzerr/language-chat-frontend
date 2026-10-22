import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api, sessionStore } from "../lib/api/client";
import { AuthProvider, useAuth } from "./auth-provider";

function Probe() {
  const { token } = useAuth();
  return <div><span data-testid="state">{token ? "giris-yapilmis" : "cikis-yapilmis"}</span><button onClick={() => api.me().catch(() => undefined)}>istek</button></div>;
}

describe("AuthProvider", () => {
  it("API 401 dönünce arayüz de çıkış yapar (eski hâlinde giriş yapılmış görünmeye devam ediyordu)", async () => {
    sessionStorage.clear();
    sessionStore.save("t".repeat(64), { id: "1", username: "ali", account_type: "registered" });
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })));
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId("state").textContent).toBe("giris-yapilmis");
    await userEvent.click(screen.getByText("istek"));
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("cikis-yapilmis"));
    vi.unstubAllGlobals();
  });
});
