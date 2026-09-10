const axios = require('axios');
require('dotenv').config();

const suggestionCache = new Map();

exports.index = async (req, res) => {
    try {
        const q = req.query.q || '';
        const page = Number(req.query.page) || 1;
        const apiUrl = `${process.env.BASE_URL}/v1/search?q=${encodeURIComponent(q)}&page=${page}`;

        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY }
        });

        const { data } = response.data; 
		
		const queryParams = new URLSearchParams({ q });
        const nextPage = data.length > 0 ? `?${queryParams.toString()}&page=${page + 1}` : null;
        const prevPage = page > 1 ? `?${queryParams.toString()}&page=${page - 1}` : null;

        res.render('search', { 
            site_title: 'Pencarian | Anime',
			site_desc: 'Temukan informasi anime yang Anda cari dengan mudah dan cepat.',
			site_keyword: 'pencarian, search, informasi, temukan, hasil pencarian',
            site_url: req.domain,
            query: q,
            data,
            nextPage,
            prevPage,
            currentPage: page
        });
    } catch (error) {
        console.error('Error fetching data:', error.response?.data || error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Anime',
            site_desc: 'Gagal mendapatkan data, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};

exports.suggestions = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 2) return res.json({ data: [] });
        const cacheKey = q.toLowerCase();
        if (suggestionCache.has(cacheKey)) return res.json({ data: suggestionCache.get(cacheKey) });

        const response = await axios.get(`${process.env.BASE_URL}/v1/search?q=${encodeURIComponent(q)}&page=1`, {
            headers: { 'x-api-key': process.env.API_KEY },
            timeout: 8000
        });
        const normalizedQuery = q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const rankedData = (response.data?.data || []).map((item, index) => {
            const normalizedTitle = (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            const words = normalizedTitle.split(' ');
            let score = 4;
            if (normalizedTitle === normalizedQuery) score = 0;
            else if (normalizedTitle.startsWith(normalizedQuery)) score = 1;
            else if (words.some(word => word.startsWith(normalizedQuery))) score = 2;
            else if (normalizedTitle.includes(normalizedQuery)) score = 3;

            return { item, score, index };
        }).sort((a, b) => a.score - b.score || a.index - b.index);
        const data = rankedData.slice(0, 6).map(({ item }) => ({
            title: item.title,
            slug: item.slug,
            image: item.image
        }));
        suggestionCache.set(cacheKey, data);
        if (suggestionCache.size > 50) suggestionCache.delete(suggestionCache.keys().next().value);
        res.json({ data });
    } catch (error) {
        res.json({ data: [] });
    }
};
