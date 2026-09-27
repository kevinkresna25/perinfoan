import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AdminPanel } from '../src/components/AdminPanel';
import * as api from '../src/services/api';
import type { Card, Rarity } from '../src/types';

vi.mock('../src/services/api', () => ({
  loginAdmin: vi.fn(),
  fetchRates: vi.fn(),
  fetchCards: vi.fn(),
  createCardApi: vi.fn(),
  deleteCardApi: vi.fn(),
  saveRarityApi: vi.fn(),
  deleteRarityApi: vi.fn(),
}));

describe('AdminPanel Component', () => {
  const mockRarities: Rarity[] = [
    { id: 'r-ssr', name: 'SSR', color: '#FFD700', drop_rate: 10, sort_order: 1 },
    { id: 'r-sr', name: 'SR', color: '#A855F7', drop_rate: 90, sort_order: 2 },
  ];

  const mockCards: Card[] = [
    {
      id: 'c1',
      name: 'Cosmic Empress',
      rarity: { id: 'r-ssr', name: 'SSR', color: '#FFD700' },
      image_url: '/uploads/c1.png',
      description: 'Leader of cosmos',
    },
    {
      id: 'c2',
      name: 'Shadow Knight',
      rarity: { id: 'r-sr', name: 'SR', color: '#A855F7' },
      image_url: '/uploads/c2.png',
      description: 'Silent blade',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(api.fetchRates).mockResolvedValue({ rarities: mockRarities, total_cards: 2 });
    vi.mocked(api.fetchCards).mockResolvedValue({ cards: mockCards });
  });

  describe('Authentication flow', () => {
    it('renders login form when no token in localStorage', () => {
      render(<AdminPanel />);
      expect(screen.getByText('Admin Authentication')).toBeDefined();
      expect(screen.getByPlaceholderText('Admin Password')).toBeDefined();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
    });

    it('handles successful login and stores token', async () => {
      vi.mocked(api.loginAdmin).mockResolvedValueOnce('valid-jwt-token');

      render(<AdminPanel />);

      const passwordInput = screen.getByPlaceholderText('Admin Password');
      fireEvent.change(passwordInput, { target: { value: 'secret123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(api.loginAdmin).toHaveBeenCalledWith('secret123');
        expect(localStorage.getItem('gacha_admin_token')).toBe('valid-jwt-token');
        expect(screen.getByText('Admin Dashboard')).toBeDefined();
      });
    });

    it('displays error message on failed login', async () => {
      vi.mocked(api.loginAdmin).mockRejectedValueOnce(new Error('Invalid credentials'));

      render(<AdminPanel />);

      const passwordInput = screen.getByPlaceholderText('Admin Password');
      fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeDefined();
      });
    });

    it('renders dashboard directly if token already exists in localStorage', async () => {
      localStorage.setItem('gacha_admin_token', 'existing-token');

      render(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeDefined();
        expect(api.fetchCards).toHaveBeenCalled();
        expect(api.fetchRates).toHaveBeenCalled();
      });
    });

    it('clears token on logout and returns to login form', async () => {
      localStorage.setItem('gacha_admin_token', 'existing-token');

      render(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /logout/i }));

      expect(localStorage.getItem('gacha_admin_token')).toBeNull();
      expect(screen.getByText('Admin Authentication')).toBeDefined();
    });
  });

  describe('Manage Cards tab', () => {
    beforeEach(() => {
      localStorage.setItem('gacha_admin_token', 'test-token');
    });

    it('renders cards list with card names and rarities', async () => {
      render(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Cosmic Empress')).toBeDefined();
        expect(screen.getByText('Shadow Knight')).toBeDefined();
        expect(screen.getByText('Manage Cards (2)')).toBeDefined();
      });
    });

    it('handles card upload successfully', async () => {
      vi.mocked(api.createCardApi).mockResolvedValueOnce();

      render(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('SSR (10%)')).toBeDefined();
      });

      const nameInput = screen.getByPlaceholderText('Card Name');
      const descInput = screen.getByPlaceholderText('Lore / Description (optional)');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'New Hero' } });
      fireEvent.change(descInput, { target: { value: 'A brave warrior' } });

      const file = new File(['hero-image-bytes'], 'hero.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const form = screen.getByRole('button', { name: /save card/i }).closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(api.createCardApi).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Card uploaded successfully!')).toBeDefined();
      });
    });

    it('displays error if card upload fails', async () => {
      vi.mocked(api.createCardApi).mockRejectedValueOnce(new Error('Failed to upload card'));

      render(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('SSR (10%)')).toBeDefined();
      });

      const nameInput = screen.getByPlaceholderText('Card Name');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'Failed Hero' } });
      const file = new File(['image'], 'test.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      const form = screen.getByRole('button', { name: /save card/i }).closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Failed to upload card')).toBeDefined();
      });
    });

    it('confirms and deletes card', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(api.deleteCardApi).mockResolvedValueOnce();

      render(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Cosmic Empress')).toBeDefined();
      });

      const deleteButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg.lucide-trash2'));
      expect(deleteButtons.length).toBeGreaterThan(0);
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this card?');
      await waitFor(() => {
        expect(api.deleteCardApi).toHaveBeenCalledWith('c1', 'test-token');
      });
    });

    it('cancels card deletion if confirm is rejected', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Cosmic Empress')).toBeDefined();
      });

      const deleteButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg.lucide-trash2'));
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(api.deleteCardApi).not.toHaveBeenCalled();
    });
  });

  describe('Manage Rarities tab', () => {
    beforeEach(() => {
      localStorage.setItem('gacha_admin_token', 'test-token');
    });

    it('switches to Manage Rarities tab and displays rarity list and total rate', async () => {
      render(<AdminPanel />);

      await waitFor(() => {
        expect(screen.getByText('Manage Rarities (2)')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Manage Rarities (2)'));

      expect(screen.getByText('Add Custom Rarity Tier')).toBeDefined();
      expect(screen.getByText(/Total configured rates:/)).toBeDefined();
      expect(screen.getByText('100%')).toBeDefined(); // 10 + 90 = 100
      expect(screen.getByText('Tier')).toBeDefined();
      expect(screen.getByText('SSR')).toBeDefined();
      expect(screen.getByText('SR')).toBeDefined();
    });

    it('handles adding new rarity tier', async () => {
      vi.mocked(api.saveRarityApi).mockResolvedValueOnce();

      render(<AdminPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Manage Rarities (2)'));
      });

      const nameInput = screen.getByPlaceholderText('Rarity Name (e.g. UR)');
      fireEvent.change(nameInput, { target: { value: 'UR' } });

      const rateInput = screen.getByPlaceholderText('Drop Rate %');
      fireEvent.change(rateInput, { target: { value: '5' } });

      fireEvent.click(screen.getByRole('button', { name: /add tier/i }));

      await waitFor(() => {
        expect(api.saveRarityApi).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'UR',
            drop_rate: 5,
          }),
          'test-token'
        );
        expect(screen.getByText('Rarity tier created!')).toBeDefined();
      });
    });

    it('confirms and deletes rarity tier', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(api.deleteRarityApi).mockResolvedValueOnce();

      render(<AdminPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Manage Rarities (2)'));
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBe(2);
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('Delete this rarity tier?');
      await waitFor(() => {
        expect(api.deleteRarityApi).toHaveBeenCalledWith('r-ssr', 'test-token');
      });
    });

    it('cancels rarity deletion if confirm is rejected', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<AdminPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Manage Rarities (2)'));
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(api.deleteRarityApi).not.toHaveBeenCalled();
    });

    it('allows editing an existing rarity tier and saving updates', async () => {
      vi.mocked(api.saveRarityApi).mockResolvedValueOnce();

      render(<AdminPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Manage Rarities (2)'));
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons.length).toBe(2);
      fireEvent.click(editButtons[0]); // Edit SSR

      // In edit mode: Save and Cancel buttons appear
      const saveButton = screen.getByRole('button', { name: /save/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(saveButton).toBeDefined();
      expect(cancelButton).toBeDefined();

      // Find the name input in the edit row with current value 'SSR'
      const nameInput = screen.getByDisplayValue('SSR');
      fireEvent.change(nameInput, { target: { value: 'SSR+' } });

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.saveRarityApi).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'r-ssr',
            name: 'SSR+',
          }),
          'test-token'
        );
        expect(screen.getByText('Rarity tier updated!')).toBeDefined();
      });
    });

    it('cancels editing an existing rarity tier', async () => {
      render(<AdminPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Manage Rarities (2)'));
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
      expect(api.saveRarityApi).not.toHaveBeenCalled();
    });
  });
});
