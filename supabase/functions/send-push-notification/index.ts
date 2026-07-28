/**
 * send-push-notification Edge Function
 * 
 * Sends push notifications to specific users via Firebase Cloud Messaging (FCM) v1 API.
 * 
 * Triggered by:
 * - Direct client call: pushNotificationService.sendPushToUsers()
 * - Future: scheduled Supabase database triggers / cron jobs
 * 
 * Environment variables required (set in Supabase Dashboard → Edge Functions → Secrets):
 * - FCM_PROJECT_ID: Your Firebase project ID (e.g. "gymix-fit")
 * - FCM_SERVICE_ACCOUNT_KEY: The full JSON content of your Firebase service account key
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const fcmProjectId = Deno.env.get('FCM_PROJECT_ID');
    const fcmServiceAccountKey = Deno.env.get('FCM_SERVICE_ACCOUNT_KEY');

    if (!fcmProjectId || !fcmServiceAccountKey) {
      return new Response(
        JSON.stringify({ error: 'FCM_PROJECT_ID and FCM_SERVICE_ACCOUNT_KEY must be set in Edge Function secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { userIds, title, message, body: notifBody, data = {}, gymId, type, relatedMemberId } = body;

    // --- SECURITY FIX: Auth Validation ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token or unauthenticated user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
    const isSuperAdmin = profile?.role === 'super_admin';

    if (gymId) {
      const { data: gymAuth } = await supabase
        .from('gyms')
        .select('id')
        .eq('id', gymId)
        .eq('owner_user_id', authData.user.id)
        .maybeSingle();

      if (!gymAuth && !isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized to act on behalf of this gym' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only super admins can send global push notifications' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // --- END SECURITY FIX ---

    // Automate WhatsApp alerts if autopilot is enabled and it is a member notification
    if (gymId && relatedMemberId && type) {
      try {
        const { data: gym, error: gymErr } = await supabase
          .from('gyms')
          .select('gym_name, wa_autopilot_enabled, wa_template_welcome, wa_template_expiry_soon, wa_template_expired, wa_template_left')
          .eq('id', gymId)
          .maybeSingle();

        if (!gymErr && gym && gym.wa_autopilot_enabled) {
          const { data: member, error: memberErr } = await supabase
            .from('members')
            .select('full_name, phone_number, membership_plan, expiry_date')
            .eq('id', relatedMemberId)
            .maybeSingle();

          if (!memberErr && member && member.phone_number) {
            let waTemplate = '';
            if (type === 'trial_ending' || type === 'membership_expiring') {
              waTemplate = gym.wa_template_expiry_soon;
            } else if (type === 'trial_expired' || type === 'membership_expired') {
              waTemplate = gym.wa_template_expired;
            } else if (type === 'left') {
              waTemplate = gym.wa_template_left;
            } else if (type === 'welcome') {
              waTemplate = gym.wa_template_welcome;
            }

            if (waTemplate) {
              const expiry = member.expiry_date
                ? new Date(member.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'soon';
              const formattedMessage = waTemplate
                .replace(/{{name}}/g, member.full_name || '')
                .replace(/{{gymName}}/g, gym.gym_name || 'Gym')
                .replace(/{{plan}}/g, member.membership_plan || 'Plan')
                .replace(/{{date}}/g, expiry);

              const waUrl = 'https://gymix-whatsapp-gateway.onrender.com/api/whatsapp/send';
              const waRes = await fetch(waUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  gymId: gymId,
                  phone: member.phone_number,
                  message: formattedMessage
                })
              });
              const waData = await waRes.json();
              console.log('FCM_EDGE_FUNCTION: WhatsApp autopilot send outcome:', waData);
            }
          }
        }
      } catch (err) {
        console.error('FCM_EDGE_FUNCTION: WhatsApp autopilot failed:', err);
      }
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch FCM tokens for the target users
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('fcm_token, user_id')
      .in('user_id', userIds);

    if (tokenError) {
      console.error('Failed to fetch push tokens:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens', detail: tokenError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No registered device tokens found for these users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get FCM access token using service account (OAuth2)
    const accessToken = await getFCMAccessToken(fcmServiceAccountKey);

    // 3. Send FCM notification to each token
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`;
    const results = [];

    for (const tokenRow of tokens) {
      try {
        const fcmPayload = {
          message: {
            token: tokenRow.fcm_token,
            notification: {
              title: title || 'Gymix',
              body: notifBody || message || '',
            },
            android: {
              notification: {
                channel_id: 'gymix_default',
                notification_priority: 'PRIORITY_HIGH',
                sound: 'default',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
              },
              priority: 'high',
            },
            data: {
              route: '/notifications',
              ...Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
              ),
            },
          },
        };

        const fcmRes = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmPayload),
        });

        const fcmData = await fcmRes.json();
        results.push({ user_id: tokenRow.user_id, status: fcmRes.status, response: fcmData });

        // If token is invalid/unregistered, remove it from database
        if (fcmRes.status === 404 || fcmData?.error?.status === 'UNREGISTERED') {
          await supabase
            .from('push_tokens')
            .delete()
            .eq('fcm_token', tokenRow.fcm_token);
          console.log(`Removed stale token for user ${tokenRow.user_id}`);
        }
      } catch (sendErr) {
        console.error(`Failed to send to token for user ${tokenRow.user_id}:`, sendErr);
        results.push({ user_id: tokenRow.user_id, status: 'error', error: String(sendErr) });
      }
    }

    const sent = results.filter(r => r.status === 200).length;
    return new Response(
      JSON.stringify({ success: true, sent, total: tokens.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Gets a short-lived FCM v1 access token using the service account JSON key.
 * Uses JWT-based OAuth2 flow (RFC 7523).
 */
async function getFCMAccessToken(serviceAccountJsonStr) {
  const serviceAccount = JSON.parse(serviceAccountJsonStr);

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Encode header and claim
  const header = { alg: 'RS256', typ: 'JWT' };
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const headerB64 = encode(header);
  const claimB64 = encode(claim);
  const signingInput = `${headerB64}.${claimB64}`;

  // Import the private key for signing
  const pemKey = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the JWT
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signingInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get FCM access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}
