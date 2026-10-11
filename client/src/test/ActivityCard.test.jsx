import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ActivityCard from '../components/ActivityCard';

const mockActivity = {
  _id: 'room123',
  title: 'Sunday Cricket Crew',
  description: 'Friendly weekend matches for all skill levels.',
  category: { name: 'Cricket', icon: 'cricket', color: '#10B981' },
  host: { displayName: 'Aman', username: 'aman.ka', verificationStatus: { verifiedBadge: true } },
  roomStatus: 'scheduling',
  visibility: 'public',
  joinPolicy: 'open',
  memberCount: 8,
  maximumParticipants: 14,
  location: { name: 'Kasaragod Ground', city: 'Kasaragod' },
  distance: 2,
  nextAt: '2026-07-28T01:30:00.000Z',
  membersPreview: [
    { _id: 'u1', displayName: 'Rohit', username: 'rohit_r' },
    { _id: 'u2', displayName: 'Priya', username: 'priya_n' },
  ],
};

describe('ActivityCard component', () => {
  it('renders title, category, location, and capacity', () => {
    render(
      <BrowserRouter>
        <ActivityCard activity={mockActivity} />
      </BrowserRouter>
    );

    expect(screen.getByText('Sunday Cricket Crew')).toBeInTheDocument();
    expect(screen.getByText('Cricket')).toBeInTheDocument();
    expect(screen.getByText('Public Room')).toBeInTheDocument();
    expect(screen.getByText(/Kasaragod/)).toBeInTheDocument();
    expect(screen.getByText('8/14')).toBeInTheDocument();
  });

  it('renders link pointing to activity detail page', () => {
    render(
      <BrowserRouter>
        <ActivityCard activity={mockActivity} />
      </BrowserRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/activities/room123');
  });
});
