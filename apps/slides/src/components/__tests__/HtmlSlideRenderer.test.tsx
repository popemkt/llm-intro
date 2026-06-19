import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HtmlSlideRenderer } from "../HtmlSlideRenderer";

describe("HtmlSlideRenderer", () => {
  it("renders authored HTML inside a sandboxed full-canvas iframe", () => {
    render(<HtmlSlideRenderer title="HTML Demo" html="<main>Hello HTML</main>" />);

    const iframe = screen.getByTitle("HTML Demo") as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("sandbox")).toBe("allow-scripts");
    expect(iframe.srcdoc).toContain("<main>Hello HTML</main>");
    expect(iframe.style.width).toBe("100%");
    expect(iframe.style.height).toBe("100%");
  });
});
