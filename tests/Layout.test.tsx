import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../components/Layout';

vi.mock('../services/db', () => ({
  authService: {
    logout: vi.fn(),
  }
}));

vi.mock('../hooks/useData', () => ({
  useData: () => ({
    user: { farmName: 'Test Farm', name: 'Test User' }
  })
}));

describe('Layout', () => {
    it('renders layout and displays farm name', () => {
        render(
            <MemoryRouter>
                <Layout onLogout={() => {}}>
                    <div>Test Content</div>
                </Layout>
            </MemoryRouter>
        );
        expect(screen.getByText('Test Farm')).toBeInTheDocument();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
});
