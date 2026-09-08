const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const { q = '', page = 1 } = req.query;
        let results = [];

        if (q) {
            const apiUrl = `${process.env.BASE_URL}/v1/en/search?q=${encodeURIComponent(q)}&page=${page}`;
            const response = await axios.get(apiUrl, {
                headers: { 'x-api-key': process.env.API_KEY },
                timeout: 10000
            });
            results = response.data?.data || [];
        }

        res.render('en-search', {
            site_title: q ? `Search "${q}" | English Anime` : 'Search English Anime',
            site_desc: `Search results for ${q} in English sub and dub anime.`,
            site_keyword: 'search anime, english sub anime, english dub anime',
            site_url: req.domain,
            data: results,
            query: q,
            page: parseInt(page) || 1
        });
    } catch (error) {
        console.error('GogoSearchController Error:', error.message);
        res.status(500).render('500', {
            site_title: 'Error | Search English Anime',
            site_desc: 'Failed to search anime, please try again.',
            site_keyword: 'error',
            site_url: req.domain
        });
    }
};
