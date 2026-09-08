const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const order = req.query.order || 'update';
        const type = req.query.type || '';
        const page = Math.max(1, parseInt(req.query.page) || 1);

        let apiUrl = `${process.env.BASE_URL}/v1/komik/list?order=${encodeURIComponent(order)}&page=${page}&limit=24`;
        if (type) apiUrl += `&type=${encodeURIComponent(type)}`;

        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY },
            timeout: 15000
        });

        const { data } = response.data;
        const nextPage = data && data.length >= 10 ? page + 1 : null;
        const prevPage = page > 1 ? page - 1 : null;

        let pageTitle = 'Chapter Terbaru | Komik';
        let pageDesc = 'Daftar rilis chapter komik manga terbaru hari ini.';
        if (type === 'manhwa') {
            pageTitle = 'Manhwa & Webtoon Populer | Komik';
            pageDesc = 'Koleksi komik manhwa Korea dan webtoon terpopuler.';
        } else if (order === 'baru') {
            pageTitle = 'Komik Rilis Baru | Komik';
            pageDesc = 'Daftar judul seri komik manga yang baru saja dirilis.';
        } else if (order === 'populer') {
            pageTitle = 'Komik Terpopuler | Komik';
            pageDesc = 'Daftar komik manga paling banyak dibaca dan difavoritkan pembaca.';
        }

        res.render('komik-news', { 
            site_title: pageTitle,
            site_desc: pageDesc,
            site_keyword: 'komik terbaru, manga update, manhwa populer, baca komik, komik baru',
            site_url: req.domain,
            data: data || [],
            order,
            type,
            nextPage,
            prevPage,
            currentPage: page
        });
    } catch (error) {
        console.error('KomikNewsController Error:', error.response?.data || error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Komik',
            site_desc: 'Gagal mendapatkan data komik, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
