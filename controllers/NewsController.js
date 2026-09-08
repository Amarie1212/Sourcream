const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const order = req.query.order || 'baru';
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const apiUrl = `${process.env.BASE_URL}/v1/list?order=${encodeURIComponent(order)}&page=${page}`;

        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY },
            timeout: 15000
        });

        const { data } = response.data;
        const nextPage = data && data.length >= 10 ? page + 1 : null;
        const prevPage = page > 1 ? page - 1 : null;

        let site_title = 'Episode Terbaru | Anime';
        let site_desc = 'Update episode anime ongoing dan rilis terbaru hari ini.';
        if (order === 'season' || order === 'musim-baru') {
            site_title = 'Anime Musim Baru | Anime';
            site_desc = 'Daftar anime serial yang rilis pada musim saat ini.';
        }

        res.render('news', { 
            site_title,
            site_desc,
            site_keyword: 'anime terbaru, anime update, anime musim ini, anime baru, anime ongoing',
            site_url: req.domain,
            data: data || [],
            order,
            nextPage,
            prevPage,
            currentPage: page
        });
    } catch (error) {
        console.error('NewsController Error:', error.response?.data || error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Anime',
            site_desc: 'Gagal mendapatkan data, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
