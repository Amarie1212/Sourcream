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

        const apiUrl = `${process.env.BASE_URL}/v1/en/detail/${slug}`;
        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY },
            timeout: 10000
        });

        const { data } = response.data;
        const episodes = data.episodesList || [];

        res.render('en-detail', {
            site_title: `${data.title} | English Anime`,
            site_desc: data.description,
            site_keyword: 'anime detail, watch anime, english subbed anime, gogoanime',
            site_url: req.domain,
            data,
            episodes
        });
    } catch (error) {
        console.error('GogoDetailController Error:', error.message);
        res.status(404).render('404', {
            site_title: 'Not Found | English Anime',
            site_desc: 'Anime not found',
            site_keyword: '404',
            site_url: req.domain
        });
    }
};
