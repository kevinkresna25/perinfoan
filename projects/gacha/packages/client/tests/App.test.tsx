import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { App } from '../src/App';

vi.mock('../src/components/SummonStage', () => ({
  SummonStage: ({ onOpenRates }: { onOpenRates: () => void }) => (
    <div data-testid="summon-stage">
      <span>Summon Stage Component</span>
      <button onClick={onOpenRates}>Open Rates</button>
    </div>
  ),
}));

vi.mock('../src/components/AlbumView', () => ({
  AlbumView: () => <div data-testid="album-view">Album View Component</div>,
}));

vi.mock('../src/components/AdminPanel', () => ({
  AdminPanel: () => <div data-testid="admin-panel">Admin Panel Component</div>,
}));

vi.mock('../src/components/RatesModal', () => ({
  RatesModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="rates-modal">
      <span>Rates Modal Component</span>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

describe('App Component', () => {
  it('renders top navigation header and defaults to SummonStage', () => {
    render(<App />);

    expect(screen.getByText(/PERINFOAN/)).toBeDefined();
    expect(screen.getByRole('button', { name: /summon/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /album/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /admin/i })).toBeDefined();

    expect(screen.getByTestId('summon-stage')).toBeDefined();
    expect(screen.queryByTestId('album-view')).toBeNull();
    expect(screen.queryByTestId('admin-panel')).toBeNull();
  });

  it('navigates to AlbumView when Album tab is clicked', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /album/i }));

    expect(screen.getByTestId('album-view')).toBeDefined();
    expect(screen.queryByTestId('summon-stage')).toBeNull();
    expect(screen.queryByTestId('admin-panel')).toBeNull();
  });

  it('navigates to AdminPanel when Admin tab is clicked', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /admin/i }));

    expect(screen.getByTestId('admin-panel')).toBeDefined();
    expect(screen.queryByTestId('summon-stage')).toBeNull();
    expect(screen.queryByTestId('album-view')).toBeNull();
  });

  it('navigates back to SummonStage when Summon tab or header logo is clicked', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    expect(screen.getByTestId('admin-panel')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /summon/i }));
    expect(screen.getByTestId('summon-stage')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /album/i }));
    expect(screen.getByTestId('album-view')).toBeDefined();

    // Click logo
    fireEvent.click(screen.getByText(/PERINFOAN/));
    expect(screen.getByTestId('summon-stage')).toBeDefined();
  });

  it('opens and closes RatesModal', () => {
    render(<App />);

    expect(screen.queryByTestId('rates-modal')).toBeNull();

    fireEvent.click(screen.getByText('Open Rates'));
    expect(screen.getByTestId('rates-modal')).toBeDefined();

    fireEvent.click(screen.getByText('Close Modal'));
    expect(screen.queryByTestId('rates-modal')).toBeNull();
  });
});
