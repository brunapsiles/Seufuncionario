// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreativeToolkit from "./CreativeToolkit.jsx";

afterEach(cleanup);

describe("CreativeToolkit", () => {
  it("cria uma prévia de carrossel com marca e chamada final", () => {
    const setToast = vi.fn();
    render(
      <CreativeToolkit
        business={{ id: "b1", name: "Doces da Ana" }}
        setToast={setToast}
      />,
    );
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Três formas de vender mais" },
    });
    fireEvent.change(
      screen.getByLabelText("Pontos do carrossel — um por linha"),
      {
        target: { value: "Responder rápido\nMostrar resultados\nFazer pós-venda" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Criar carrossel" }));
    const preview = screen.getByLabelText("Prévia do carrossel");
    expect(within(preview).getByText("Três formas de vender mais")).toBeInTheDocument();
    expect(within(preview).getByText("Responder rápido")).toBeInTheDocument();
    expect(within(preview).getAllByText("Doces da Ana").length).toBeGreaterThan(0);
    expect(setToast).toHaveBeenCalledWith("5 slides criados");
  });

  it("navega entre imagens e QR Code", () => {
    render(<CreativeToolkit business={null} setToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Imagens em lote" }));
    expect(screen.getByText("Adicionar imagens")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "QR Code" }));
    expect(screen.getByLabelText("Link ou texto")).toBeInTheDocument();
  });
});
