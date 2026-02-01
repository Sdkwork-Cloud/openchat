/**
 * Button 组件测试
 * 
 * 职责：验证 Button 组件的行为和渲染
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './index';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByText('Loading')).toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('bg-[#0EA5E9]');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByText('Secondary')).toHaveClass('bg-[#1E293B]');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByText('Ghost')).toHaveClass('hover:bg-[rgba(255,255,255,0.05)]');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByText('Small')).toHaveClass('px-3', 'py-1.5', 'text-xs');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByText('Medium')).toHaveClass('px-4', 'py-2', 'text-sm');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByText('Large')).toHaveClass('px-6', 'py-2.5', 'text-base');
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toContainElement(
      screen.getByRole('status', { hidden: true })
    );
  });

  it('supports custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByText('Custom')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref Test</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
