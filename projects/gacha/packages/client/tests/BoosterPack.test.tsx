import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BoosterPack } from '../src/components/BoosterPack';

describe('BoosterPack Component', () => {
  it('renders booster pack with title and tear trigger', () => {
    const handleTear = vi.fn();
    render(<BoosterPack count={10} onTear={handleTear} />);

    expect(screen.getByText(/PERINFOAN BOOSTER/i)).toBeDefined();
    expect(screen.getByText(/10 CARDS/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /rip pack|brewek pack|tear/i })).toBeDefined();
  });

  it('triggers onTear when rip button is clicked', () => {
    vi.useFakeTimers();
    const handleTear = vi.fn();
    render(<BoosterPack count={10} onTear={handleTear} />);

    const ripButton = screen.getByRole('button', { name: /rip pack|brewek pack|tear/i });
    fireEvent.click(ripButton);

    vi.advanceTimersByTime(700);
    expect(handleTear).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('supports skip to instant reveal', () => {
    const handleTear = vi.fn();
    const handleSkip = vi.fn();
    render(<BoosterPack count={1} onTear={handleTear} onSkip={handleSkip} />);

    const skipButton = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(skipButton);

    expect(handleSkip).toHaveBeenCalledTimes(1);
  });
});
