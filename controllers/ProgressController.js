const { getSupabase, getUserFromRequest } = require('../helpers/SupabaseHelper');

function userClient(req) {
  return getSupabase(req.cookies?.sb_access_token);
}

exports.mark = async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' });
    const { animeSlug, animeTitle, episodeSlug, episodeNumber } = req.body;
    const number = Number(episodeNumber);
    if (!animeSlug || !episodeSlug || !Number.isFinite(number)) return res.status(400).json({ success: false });

    const { error } = await userClient(req).from('watch_progress').upsert({
      user_id: user.id, anime_slug: animeSlug, anime_title: animeTitle || animeSlug,
      episode_slug: episodeSlug, episode_number: number, watched_at: new Date().toISOString()
    }, { onConflict: 'user_id,anime_slug,episode_number' });
    if (error) throw error;
    res.json({ success: true, episodeNumber: number });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan progres.' });
  }
};

