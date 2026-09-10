const { getSupabase, getUserFromRequest } = require('../helpers/SupabaseHelper');

function getUserClient(req) {
  return getSupabase(req.cookies?.sb_access_token);
}

exports.index = async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.redirect('/login');

    const client = getUserClient(req);
    const { data, error } = await client
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: progressRows, error: progressError } = await client
      .from('watch_progress').select('anime_slug,episode_number').eq('user_id', user.id);
    if (progressError) throw progressError;
    const progressMap = new Map();
    (progressRows || []).forEach(row => progressMap.set(row.anime_slug, Math.max(progressMap.get(row.anime_slug) || 0, Number(row.episode_number))));

    const enrichedData = (data || []).map(item => ({ ...item, progressEpisode: progressMap.get(item.anime_slug) || 0 }));

    res.render('watchlist', {
      site_title: 'Watchlist | Sourcream',
      site_desc: 'Anime saved to your watchlist.',
      site_keyword: 'watchlist anime',
      site_url: req.domain,
      data: enrichedData,
      currentUser: user
    });
  } catch (error) {
    res.status(500).render('500', { site_title: 'Watchlist | Sourcream', site_desc: 'Watchlist is unavailable.', site_keyword: 'watchlist', site_url: req.domain });
  }
};

exports.add = async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Please log in first.' });
    const { slug, title, image } = req.body;
    const allowedStatuses = ['planned', 'watching', 'watched', 'on_hold', 'dropped'];
    const status = allowedStatuses.includes(req.body.status) ? req.body.status : 'planned';
    const { error } = await getUserClient(req).from('watchlist').upsert({ user_id: user.id, anime_slug: slug, title, image, status }, { onConflict: 'user_id,anime_slug' });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Watchlist save error:', error.message);
    res.status(500).json({ success: false, message: 'Unable to save the watchlist. Apply the latest Supabase SQL for watchlist policies.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false });
    const { error } = await getUserClient(req).from('watchlist').delete().eq('user_id', user.id).eq('anime_slug', req.params.slug);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus watchlist.' });
  }
};

exports.status = async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false });
    const { data, error } = await getUserClient(req)
      .from('watchlist')
      .select('status')
      .eq('user_id', user.id)
      .eq('anime_slug', req.params.slug)
      .maybeSingle();
    if (error) throw error;
    res.json({ success: true, status: data?.status || null });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};
