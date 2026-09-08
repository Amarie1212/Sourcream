const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const order = req.query.order || 'populer';
        const page = Math.max(1, parseInt(req.query.page) || 1);
        
        // Map order to API parameter
        const apiOrder = (order === 'terbaru' || order === 'movie_terbaru') ? 'movie_terbaru' : 'movie_populer';
        const apiUrl = `${process.env.BASE_URL}/v1/list?order=${apiOrder}&page=${page}`;

        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY },
            timeout: 15000
        });

        const { data } = response.data;
        const nextPage = data && data.length >= 10 ? page + 1 : null;
        const prevPage = page > 1 ? page - 1 : null;

        res.render('movies', { 
            site_title: 'Anime Movies | Sourcream',
            site_desc: 'Daftar anime movie rilis terbaru dan film anime terpopuler sepanjang masa.',
            site_keyword: 'anime movies, film anime, nonton anime movie, anime movie sub indo',
            site_url: req.domain,
            data: data || [],
            order,
            nextPage,
            prevPage,
            currentPage: page
        });
    } catch (error) {
        console.error('MovieController Error:', error.response?.data || error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Anime Movies',
            site_desc: 'Gagal mendapatkan data movie, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
