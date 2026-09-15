import { AdminRouteError, AdminRoutePending } from '@/components/route-state';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('admin route states', () => {
  it('announces loading without hiding the page purpose', () => {
    render(<AdminRoutePending resource="workouts" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading workouts');
  });

  it('shows a generic error and retries through the router reset callback', () => {
    const reset = vi.fn();
    render(<AdminRouteError resource="coaches" reset={reset} />);
    expect(screen.getByRole('alert')).not.toHaveTextContent('database');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
