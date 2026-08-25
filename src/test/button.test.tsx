import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button primitive", () => {
  it("renders label text", () => {
    render(<Button type="button">Start</Button>);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });
});
