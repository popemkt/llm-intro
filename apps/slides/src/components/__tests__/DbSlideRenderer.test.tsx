import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DbSlideRenderer } from "../DbSlideRenderer";
import type { Block } from "@/types";

describe("DbSlideRenderer", () => {
  it("renders empty state when no blocks", () => {
    render(<DbSlideRenderer blocks={[]} theme="dark-green" />);
    expect(screen.getByText("empty slide")).toBeInTheDocument();
  });

  it("renders text block with markdown", () => {
    const blocks: Block[] = [{ id: "1", type: "text", markdown: "**Bold text**" }];
    render(<DbSlideRenderer blocks={blocks} theme="dark-green" />);
    expect(screen.getByText("Bold text")).toBeInTheDocument();
  });

  it("renders image block", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "image",
        url: "/api/presentations/1/assets/2/content",
        assetId: 2,
        alt: "test image",
        objectPosition: "center top",
      },
    ];
    render(<DbSlideRenderer blocks={blocks} theme="dark-green" />);
    const img = screen.getByAltText("test image") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("/api/presentations/1/assets/2/content");
    expect(img.style.objectPosition).toBe("center top");
  });

  it("renders iframe block", () => {
    const blocks: Block[] = [{ id: "1", type: "iframe", url: "https://example.com", height: 400 }];
    render(<DbSlideRenderer blocks={blocks} theme="dark-green" />);
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toBe("https://example.com/");
  });

  it("applies data-theme attribute", () => {
    const { container } = render(<DbSlideRenderer blocks={[]} theme="neon" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute("data-theme")).toBe("neon");
  });

  it("applies slide background fields", () => {
    const { container } = render(
      <DbSlideRenderer
        background={{
          fill: "linear-gradient(135deg, #0d0f0e, #123456)",
          imageUrl: "data:image/svg+xml,%3Csvg%2F%3E",
          imageFit: "contain",
          imagePosition: "center",
        }}
        blocks={[]}
        theme="dark-green"
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.background).toContain("linear-gradient");
    expect(wrapper.style.backgroundImage).toContain("data:image/svg+xml");
    expect(wrapper.style.backgroundSize).toBe("contain");
    expect(wrapper.style.backgroundPosition).toContain("center");
  });

  it("renders multiple blocks", () => {
    const blocks: Block[] = [
      { id: "1", type: "text", markdown: "First block" },
      { id: "2", type: "text", markdown: "Second block" },
    ];
    render(<DbSlideRenderer blocks={blocks} theme="light" />);
    expect(screen.getByText("First block")).toBeInTheDocument();
    expect(screen.getByText("Second block")).toBeInTheDocument();
  });

  it("applies manual block appearance fields", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "text",
        markdown: "Styled text",
        x: 10,
        y: 10,
        w: 50,
        h: 20,
        rotation: 6,
        opacity: 0.7,
        shadow: "0 12px 32px rgba(0,0,0,0.35)",
        fontSize: 36,
        fontFamily: "Georgia, serif",
        fontWeight: 700,
        fontStyle: "italic",
        lineHeight: 1.25,
        color: "#ffffff",
        background: "#123456",
        align: "center",
        padding: 18,
      },
      {
        id: "2",
        type: "shape",
        shape: "pill",
        color: "#25d366",
        label: "Badge",
        borderColor: "#ffffff",
        borderWidth: 2,
        textColor: "#0d0f0e",
        labelFontSize: 18,
        labelFontWeight: 800,
        x: 10,
        y: 40,
        w: 20,
        h: 10,
      },
      {
        id: "3",
        type: "line",
        color: "#ffd93d",
        strokeWidth: 5,
        dash: "dash",
        endArrow: true,
        x: 10,
        y: 58,
        w: 50,
        h: 10,
      },
      {
        id: "4",
        type: "table",
        rows: [
          ["Mode", "Use"],
          ["Manual", "Structured"],
        ],
        headerRows: 1,
        fontSize: 14,
        headerBackground: "#123456",
        borderColor: "#ffffff",
        borderWidth: 1,
        align: "center",
        x: 10,
        y: 72,
        w: 60,
        h: 18,
      },
      {
        id: "5",
        type: "chart",
        chart: "bar",
        title: "Adoption",
        categories: ["Manual", "HTML"],
        series: [{ name: "Usage", values: [42, 24], color: "#25d366" }],
        showLegend: true,
        showValues: true,
        x: 10,
        y: 12,
        w: 60,
        h: 24,
      },
    ];
    const { container } = render(<DbSlideRenderer blocks={blocks} theme="dark-green" />);

    const wrapper = container.querySelector('[style*="rotate(6deg)"]') as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.style.opacity).toBe("0.7");
    expect(wrapper.style.boxShadow).toBe("0 12px 32px rgba(0,0,0,0.35)");

    const text = screen.getByText("Styled text").closest(".prose-block") as HTMLElement;
    expect(text.style.fontSize).toBe("36px");
    expect(text.style.fontFamily).toBe("Georgia, serif");
    expect(text.style.fontWeight).toBe("700");
    expect(text.style.fontStyle).toBe("italic");
    expect(text.style.lineHeight).toBe("1.25");
    expect(text.style.background).toBe("rgb(18, 52, 86)");
    expect(text.style.textAlign).toBe("center");

    const badge = screen.getByText("Badge").parentElement as HTMLElement;
    expect(badge.style.border).toBe("2px solid rgb(255, 255, 255)");
    expect(screen.getByText("Badge")).toHaveStyle({
      color: "rgb(13, 15, 14)",
      fontSize: "18px",
      fontWeight: "800",
    });

    const line = container.querySelector('line[stroke="#ffd93d"]') as SVGLineElement;
    expect(line).toBeInTheDocument();
    expect(line.getAttribute("stroke-width")).toBe("5");
    expect(line.getAttribute("stroke-dasharray")).toBe("10 8");
    expect(line.getAttribute("marker-end")).toContain("line-arrow-3");

    expect(screen.getByText("Mode")).toBeInTheDocument();
    expect(screen.getByText("Structured")).toBeInTheDocument();
    const tableHeader = screen.getByText("Mode").closest("th") as HTMLElement;
    expect(tableHeader.style.background).toBe("rgb(18, 52, 86)");
    expect(tableHeader.style.textAlign).toBe("center");

    expect(screen.getByLabelText("Adoption")).toBeInTheDocument();
    expect(screen.getByText("Usage")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
