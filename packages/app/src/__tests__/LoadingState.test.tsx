import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LoadingState from "@/components/LoadingState";

// lucide-react icons aren't critical to test — stub them out for stable snapshots
vi.mock("lucide-react", () => ({
  Loader2: (props: any) => <svg {...props} data-icon="loader2" />,
}));

describe("LoadingState", () => {
  it("matches snapshot: block variant, no message", () => {
    const { container } = render(<LoadingState />);
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: block variant with message", () => {
    const { container } = render(<LoadingState message="Loading workers…" />);
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: inline variant with message", () => {
    const { container } = render(<LoadingState variant="inline" message="Loading more…" />);
    expect(container).toMatchSnapshot();
  });

  it("renders an accessible status role", () => {
    const { getByRole } = render(<LoadingState />);
    expect(getByRole("status")).toBeInTheDocument();
  });
});
