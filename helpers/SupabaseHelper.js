const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

function getSupabase(accessToken = null) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }
  const options = {
    auth: { persistSession: false, autoRefreshToken: false }
  };
  if (accessToken) options.global = { headers: { Authorization: `Bearer ${accessToken}` } };
  return createClient(supabaseUrl, supabaseAnonKey, options);
}

async function getUserFromRequest(req) {
  const accessToken = req.cookies?.sb_access_token;
  if (!accessToken) return null;

  const { data, error } = await getSupabase().auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

module.exports = { getSupabase, getUserFromRequest };
