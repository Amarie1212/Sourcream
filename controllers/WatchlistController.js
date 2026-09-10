const { getSupabase, getUserFromRequest } = require('../helpers/SupabaseHelper');
const axios = require('axios');
require('dotenv').config();

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
    await Promise.all(enrichedData.map(async item => {
      try {
        const response = await axios.get(`${process.env.BASE_URL}/v1/detail/${item.anime_slug}`, { headers: { 'x-api-key': process.env.API_KEY }, timeout: 5000 });
        const latestEpisode = Number(response.data?.data?.episodes || 0);
        if (latestEpisode > item.progressEpisode) {
          await client.from('notifications').upsert({
            user_id: user.id,
            anime_slug: item.anime_slug,
            title: item.title,
            message: `Episode baru tersedia: Episode ${latestEpisode}`
          }, { onConflict: 'user_id,anime_slug,message' });
        }
      } catch (error) {
        // A failed metadata check must not block the watchlist page.
      }
    }));

    res.render('watchlist', {
      site_title: 'Watchlist | Sourcream',
      site_desc: 'Anime yang kamu simpan di watchlist.',
      site_keyword: 'watchlist anime',
      site_url: req.domain,
      data: enrichedData,
      currentUser: user
    });
  } catch (error) {
    res.status(500).render('500', { site_title: 'Watchlist | Sourcream', site_desc: 'Watchlist tidak tersedia.', site_keyword: 'watchlist', site_url: req.domain });
  }
};

exports.add = async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' });
    const { slug, title, image } = req.body;
    const allowedStatuses = ['planned', 'watching', 'on_hold', 'dropped'];
    const status = allowedStatuses.includes(req.body.status) ? req.body.status : 'planned';
    const { error } = await getUserClient(req).from('watchlist').upsert({ user_id: user.id, anime_slug: slug, title, image, status }, { onConflict: 'user_id,anime_slug' });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Watchlist save error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal menyimpan watchlist. Jalankan SQL Supabase terbaru agar kolom status dan policy watchlist tersedia.' });
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
