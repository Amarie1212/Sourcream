const axios = require('axios');
const { getSupabase } = require('../helpers/SupabaseHelper');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const { slug } = req.params;
        
        if (!slug) {
            return res.status(400).render('404', { 
				site_title: 'Halaman Tidak Ada | Anime',
				site_desc: '',
				site_keyword: '',
				site_url: req.domain
			});
        }

        const apiUrl = `${process.env.BASE_URL}/v1/detail/${slug}`;
        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY }
        });
        const { data } = response.data;

        const baseSlug = slug.replace(/-dub$/i, '');
        const isDubPage = /-dub$/i.test(slug) || /\(dub\)/i.test(data.title || '');
        const companionSlug = isDubPage ? baseSlug : `${baseSlug}-dub`;
        let companionData = null;

        if (companionSlug !== slug) {
            try {
                const companionResponse = await axios.get(`${process.env.BASE_URL}/v1/detail/${companionSlug}`, {
                    headers: { 'x-api-key': process.env.API_KEY },
                    timeout: 6000
                });
                const candidate = companionResponse.data?.data;
                const candidateIsDub = /-dub$/i.test(companionSlug) || /\(dub\)/i.test(candidate?.title || '');
                if (candidate && candidateIsDub) companionData = candidate;
            } catch (error) {
                // Dub is optional; the subtitle version remains fully usable.
            }
        }

        // Sort episodes ascending (1 to N)
        const rawEpisodes = data.episodesList || [];
        const getEpisodeNumber = (episode) => {
            const source = `${episode.slug || ''} ${episode.title || ''}`;
            const match = source.match(/episode-(\d+(\.\d+)?)/i) || source.match(/\b(\d+(\.\d+)?)\b/);
            return match ? parseFloat(match[1] || match[0]) : 0;
        };
        const sortEpisodes = (episodes) => [...(episodes || [])].sort((a, b) => {
            const matchA = a.slug ? a.slug.match(/episode-(\d+(\.\d+)?)/i) : (a.title ? a.title.match(/\d+(\.\d+)?/) : null);
            const matchB = b.slug ? b.slug.match(/episode-(\d+(\.\d+)?)/i) : (b.title ? b.title.match(/\d+(\.\d+)?/) : null);
            const numA = matchA ? parseFloat(matchA[1] || matchA[0]) : 0;
            const numB = matchB ? parseFloat(matchB[1] || matchB[0]) : 0;
            return numA - numB;
        });
        const sortedEpisodes = sortEpisodes(rawEpisodes);
        const sortedCompanionEpisodes = sortEpisodes(companionData?.episodesList);
        const episodeMap = new Map();

        sortedEpisodes.forEach((episode) => {
            episodeMap.set(getEpisodeNumber(episode), { ...episode, subSlug: isDubPage ? null : episode.slug, dubSlug: isDubPage ? episode.slug : null });
        });
        sortedCompanionEpisodes.forEach((episode) => {
            const number = getEpisodeNumber(episode);
            const merged = episodeMap.get(number) || { ...episode };
            merged.subSlug = isDubPage ? episode.slug : (merged.subSlug || null);
            merged.dubSlug = isDubPage ? (merged.dubSlug || null) : episode.slug;
            if (!merged.slug) merged.slug = merged.subSlug || merged.dubSlug;
            episodeMap.set(number, merged);
        });

        const mergedEpisodes = Array.from(episodeMap.values()).sort((a, b) => getEpisodeNumber(a) - getEpisodeNumber(b));
        mergedEpisodes.forEach((episode) => {
            episode.slug = episode.subSlug || episode.dubSlug;
        });
        const hasDub = mergedEpisodes.some((episode) => episode.dubSlug);
        const hasSub = mergedEpisodes.some((episode) => episode.subSlug);
        const displayData = { ...data, title: (data.title || '').replace(/\s*\(dub\)\s*/i, '').trim() };

        const responseSidebar = await axios.get(`${process.env.BASE_URL}/v1/list?order=populer`, {
			headers: { 'x-api-key': process.env.API_KEY }
		});
		const dataSidebar = responseSidebar.data?.data || [];
		const getDataSidebar = dataSidebar.sort(() => 0.8 - Math.random()).slice(0, 8);
		
        const currentUser = res.locals.currentUser;
        let watchedEpisodeNumbers = [];
        if (currentUser) {
            try {
                const { data: progressRows, error: progressError } = await getSupabase(req.cookies?.sb_access_token)
                    .from('watch_progress')
                    .select('episode_number')
                    .eq('user_id', currentUser.id)
                    .eq('anime_slug', displayData.slug);
                if (progressError) throw progressError;
                watchedEpisodeNumbers = (progressRows || []).map(row => Number(row.episode_number)).filter(Number.isFinite);
            } catch (error) {
                // Progress must not prevent the anime detail page from rendering.
                console.error('Detail progress lookup error:', error.message);
            }
        }
        res.locals = {
            site_title: `${displayData.title} | Anime`,
            site_desc: `${data.description}`,
            site_keyword: 'detail anime, nonton anime, daftar anime, streaming anime',
            site_url: req.domain,
            currentUser
        };

        res.render('detail', { 
            data: displayData,
            episodes: mergedEpisodes,
            hasDub,
            hasSub,
            variant: isDubPage ? 'dub' : 'sub',
            getDataSidebar,
			currentUser,
			watchedEpisodeNumbers
		});
    } catch (error) {
        console.error('Error fetching data:', error.response?.data || error.message);
        const statusCode = error.response?.status || 500;

        if (statusCode === 404) {
            return res.status(404).render('404', { 
				site_title: 'Halaman Tidak Ada | Anime',
				site_desc: '',
				site_keyword: '',
				site_url: req.domain
			});
        }

        res.status(statusCode).render('500', { 
            site_title: 'Terjadi Kesalahan | Anime',
            site_desc: 'Gagal mendapatkan data, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
