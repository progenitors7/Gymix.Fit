/**
 * waFetch.js
 * Central helper for making authenticated requests to the Gymix WhatsApp Gateway.
 *
 * BUG #2 FIX: Previously all fetch() calls to /api/whatsapp/* were unauthenticated.
 * This helper automatically attaches the X-API-KEY header to every request.
 */

import { supabase } from './supabaseClient';

const WA_BACKEND_URL = import.meta.env.VITE_WA_BACKEND_URL || 'http://localhost:5000';

/**
 * Authenticated fetch wrapper for the WhatsApp Gateway.
 * Automatically adds the dynamic Authorization Bearer header.
 *
 * @param {string} path - API path, e.g. '/api/whatsapp/send'
 * @param {RequestInit} options - Standard fetch options (method, body, etc.)
 * @returns {Promise<Response>}
 */
export async function waFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Dynamically retrieve the current user session and attach the JWT token
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  } catch (err) {
    console.warn('[waFetch] Failed to fetch session token:', err);
  }

  return fetch(`${WA_BACKEND_URL}${path}`, {
    ...options,
    headers,
  });
}

export { WA_BACKEND_URL };
