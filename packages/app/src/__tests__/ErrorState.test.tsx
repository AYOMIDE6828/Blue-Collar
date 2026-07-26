import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorState from "@/components/ErrorState";

// lucide-react icons aren't critical to test — stub them out for stable snapshots
vi.mock("lucide-react", () => ({
  AlertTriangle: (props: any) => <svg {...props} data-icon="alert-triangle" />,
}));

describe("ErrorState", () => {
  it("matches snapshot: block variant with title, message, and retry", () => {
    const { container } = render(
      <ErrorState title="Something went wrong" message="Failed to load workers." onRetry={() => {}} />
    );
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: block variant without retry", () => {
    const { container } = render(<ErrorState message="Failed to load workers." />);
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: inline variant with retry", () => {
    const { container } = render(
      <ErrorState variant="inline" message="Failed to load transactions." onRetry={() => {}} />
    );
    expect(container).toMatchSnapshot();
  });

  it("renders an accessible alert role", () => {
    const { getByRole } = render(<ErrorState message="Failed" />);
    expect(getByRole("alert")).toBeInTheDocument();
  });

  it("does not render a retry button when onRetry is omitted", () => {
    const { queryByRole } = render(<ErrorState message="Failed" />);
    expect(queryByRole("button")).not.toBeInTheDocument();
  });
});
