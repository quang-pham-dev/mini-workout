import { createDisablePreviewResponse } from './session.js';
import type { APIRoute } from 'astro';

export const GET: APIRoute = () => createDisablePreviewResponse();
