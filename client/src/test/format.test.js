import { describe, it, expect } from 'vitest';
import {
  formatDateTime, formatTime, fromNow, toInputDateTime,
  STATUS_LABELS, timeOfDayLabel
} from '../lib/format';

describe('format utilities', () => {
  it('formats dates in Asia/Kolkata timezone', () => {
    // 2026-07-28 01:30:00 UTC = 2026-07-28 07:00:00 IST
    const utcDate = new Date('2026-07-28T01:30:00.000Z');
    const formatted = formatDateTime(utcDate);
    expect(formatted).toContain('Jul 28');
    expect(formatted).toContain('7:00 AM');
  });

  it('formats time correctly', () => {
    const utcDate = new Date('2026-07-28T01:30:00.000Z');
    expect(formatTime(utcDate)).toBe('7:00 AM');
  });

  it('handles null or empty date gracefully', () => {
    expect(formatDateTime(null)).toBe('TBD');
    expect(formatTime(null)).toBe('');
    expect(fromNow(null)).toBe('');
  });

  it('generates valid datetime-local strings', () => {
    const utcDate = new Date('2026-07-28T01:30:00.000Z');
    expect(toInputDateTime(utcDate)).toBe('2026-07-28T07:00');
  });

  it('provides human-readable status labels', () => {
    expect(STATUS_LABELS.open).toBe('Open');
    expect(STATUS_LABELS.scheduling).toBe('Scheduling');
    expect(STATUS_LABELS.scheduled).toBe('Scheduled');
    expect(STATUS_LABELS.cancelled).toBe('Cancelled');
  });

  it('labels time of day slots correctly', () => {
    const morning = new Date('2026-07-28T02:00:00.000Z'); // 7:30 AM IST
    const afternoon = new Date('2026-07-28T08:30:00.000Z'); // 2:00 PM IST
    const evening = new Date('2026-07-28T12:00:00.000Z'); // 5:30 PM IST
    expect(timeOfDayLabel(morning)).toBe('Morning');
    expect(timeOfDayLabel(afternoon)).toBe('Afternoon');
    expect(timeOfDayLabel(evening)).toBe('Evening');
  });
});
