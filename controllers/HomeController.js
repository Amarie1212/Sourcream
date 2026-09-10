const axios = require('axios');
require('dotenv').config();

const DAILY_SPOTLIGHT_PROMPTS = [
    'cinematic futuristic city at blue hour, neon reflections, atmospheric architecture, no text',
    'beautiful anime-inspired traveler on a quiet hill above a glowing city, cinematic sunset, no text',
    'coastal city after rain, glass towers, warm windows, dramatic clouds, high detail, no text',
    'anime-inspired character under a red umbrella in a lantern-lit street, cinematic composition, no text',
    'peaceful mountain city in spring, soft mist, vivid colors, detailed environment concept art, no text',
    'night train crossing a luminous modern city, cinematic wide shot, atmospheric, no text',
    'anime-inspired swordswoman overlooking a floating city, golden sky, polished illustration, no text',
    'quiet cyberpunk alley with flowering trees and rain reflections, cinematic, no text'
];

function getDailySpotlights() {
    const daySeed = Math.floor(Date.now() / 86400000);
    return DAILY_SPOTLIGHT_PROMPTS.map((prompt, index) => ({
        title: '',
        image: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1920&height=800&nologo=true&seed=${daySeed + index}`
    }));
}

exports.index = async (req, res) => {
    try {
        const fetchSection = async (order) => {
            try {
                const r = await axios.get(`${process.env.BASE_URL}/v1/list?order=${order}`, {
                    headers: { 'x-api-key': process.env.API_KEY },
                    timeout: 10000
                });
                return (r.data?.data || []).slice(0, 10);
            } catch (err) {
                console.error(`Failed to fetch section ${order}:`, err.message);
                return [];
            }
        };

        const fetchAlphabet = async () => {
            try {
                const r = await axios.get(`${process.env.BASE_URL}/v1/filter/alphabet`, {
                    headers: { 'x-api-key': process.env.API_KEY },
                    timeout: 8000
                });
                return r.data?.data || [];
            } catch (err) {
                return [];
            }
        };

        // Fetch all 5 anime sections + alphabet concurrently
        const [
            latestEpisodes,
            newSeason,
            popular,
            newMovies,
            popularMovies,
            alphabet
        ] = await Promise.all([
            fetchSection('baru'),
            fetchSection('season'),
            fetchSection('populer'),
            fetchSection('movie_terbaru'),
            fetchSection('movie_populer'),
            fetchAlphabet()
        ]);

        const cleanEpisodeLabels = (items) => items.map(item => ({
            ...item,
            episodes: typeof item.episodes === 'string'
                ? item.episodes.replace(/^[\s\S]*?Updated:\s*/i, '').trim()
                : item.episodes
        }));

        res.render('home', { 
            site_title: 'Beranda | Sourcream Anime Streaming',
            site_desc: 'Nonton streaming anime dan film bioskop anime sub indo full HD gratis bebas iklan di Sourcream.',
            site_keyword: 'anime, nonton anime, anime sub indo, episode terbaru, anime movie, stream anime',
            site_url: req.domain,
            data: { 
                spotlight: getDailySpotlights(),
                latestEpisodes: cleanEpisodeLabels(latestEpisodes),
                newSeason: cleanEpisodeLabels(newSeason),
                popular: cleanEpisodeLabels(popular),
                newMovies: cleanEpisodeLabels(newMovies),
                popularMovies: cleanEpisodeLabels(popularMovies)
            },
            alphabet 
        });

    } catch (error) {
        console.error('HomeController Error:', error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Anime',
            site_desc: 'Gagal memuat data beranda anime, coba lagi nanti.',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
