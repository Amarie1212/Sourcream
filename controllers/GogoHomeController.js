const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const apiUrl = `${process.env.BASE_URL}/v1/en/list?page=${page}`;
        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY },
            timeout: 10000
        });

        const list = response.data?.data || [];

        res.render('en-home', {
            site_title: 'English Anime (Sub & Dub) | Sourcream',
            site_desc: 'Watch English subbed and dubbed anime streaming with high quality video on Sourcream.',
            site_keyword: 'anime english sub, anime english dub, watch anime online, gogoanime streaming',
            site_url: req.domain,
            data: list,
            page
        });
    } catch (error) {
        console.error('GogoHomeController Error:', error.message);
        res.status(500).render('500', {
            site_title: 'Error | English Anime',
            site_desc: 'Failed to load English anime, please try again later.',
            site_keyword: 'error',
            site_url: req.domain
        });
    }
};
