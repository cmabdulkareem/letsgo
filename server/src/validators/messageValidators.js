import { z } from 'zod';
import { paginationQuery } from './common.js';

export const listMessagesQuerySchema = paginationQuery.extend({
  before: z.string().optional(), // ISO date cursor for earlier pages
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000, 'Messages are limited to 2000 characters'),
});
