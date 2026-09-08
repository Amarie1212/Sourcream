const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const { slug } = req.params;
        if (!slug) {
            return res.status(400).render('404', {
                site_title: 'Not Found | English Anime',
                site_desc: '',
                site_keyword: '',
                site_url: req.domain
            });
        }

        const apiUrl = `${process.env.BASE_URL}/v1/en/episode/${slug}`;
        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY },
            timeout: 10000
        });

        const { data } = response.data;

        // Fetch detail to get full episode list
        let episodesList = [];
        let animeDetail = null;
        if (data.animeSlug) {
            try {
                const detailRes = await axios.get(`${process.env.BASE_URL}/v1/en/detail/${data.animeSlug}`, {
                    headers: { 'x-api-key': process.env.API_KEY },
                    timeout: 4000
                });
                if (detailRes.data?.data) {
                    animeDetail = detailRes.data.data;
                    episodesList = animeDetail.episodesList || [];
                }
            } catch (err) {
                // Ignore detail fetch errors gracefully
            }
        }

        res.render('en-episode', {
            site_title: `${data.title} | English Anime`,
            site_desc: data.description,
            site_keyword: 'watch anime, streaming anime, english subbed anime, gogoanime',
            site_url: req.domain,
            data,
            animeSlug: data.animeSlug,
            animeTitle: data.animeTitle || animeDetail?.title || '',
            episodes: episodesList
        });
    } catch (error) {
        console.error('GogoEpisodeController Error:', error.message);
        res.status(404).render('404', {
            site_title: 'Episode Not Found | English Anime',
            site_desc: 'Episode not found',
            site_keyword: '404',
            site_url: req.domain
        });
    }
};
