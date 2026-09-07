const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const show = (req.query.show || 'A').toUpperCase();
        const page = parseInt(req.query.page) || 1;
        
        // Fetch alphabet results from komik alphabet API
        const apiUrl = `${process.env.BASE_URL}/v1/komik/alphabet?show=${encodeURIComponent(show)}&page=${page}`;
        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY }
        });
        const { data } = response.data;
        
        const alphabet = Array.from({ length: 26 }, (_, i) => {
            const letter = String.fromCharCode(65 + i);
            return { slug: letter, title: letter };
        });

        const queryParams = new URLSearchParams({ show });
        const nextPage = data && data.length > 0 ? `?${queryParams.toString()}&page=${page + 1}` : null;
        const prevPage = page > 1 ? `?${queryParams.toString()}&page=${page - 1}` : null;

        res.render('komik-alphabet', { 
            site_title: `Berdasarkan ${show} | Komik`,
            site_desc: `Daftar komik, manga, manhwa berawalan abjad ${show}.`,
            site_keyword: `komik ${show}, manga ${show}, manhwa ${show}, indeks komik a-z`,
            site_url: req.domain,
            data: data || [],
            show,
            alphabet,
            nextPage,
            prevPage,
            currentPage: page
        });
    } catch (error) {
        console.error('Error fetching komik alphabet data:', error.response?.data || error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Komik',
            site_desc: 'Gagal mendapatkan data, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
