const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const orders = ['date', 'modified', 'meta_value_num', 'rand'];
        const requests = orders.map(order =>
            axios.get(`${process.env.BASE_URL}/v1/komik/list?order=${order}`, {
                headers: { 'x-api-key': process.env.API_KEY }
            })
        );
        const responses = await Promise.all(requests);
        const [date, modified, meta_value_num, rand] = responses.map(res => res.data.data);
		
        const alphabet = Array.from({ length: 26 }, (_, i) => {
            const letter = String.fromCharCode(65 + i);
            return { slug: letter, title: letter };
        });

        res.render('komik', { 
            site_title: 'Beranda | Komik',
            site_desc: 'Selamat datang di FuckMik tempat baca komik sub indonesia.',
            site_keyword: 'komik, baca komik, daftar komik, komik streaming, komik sub indo',
            site_url: req.domain,
            data: { date, modified, meta_value_num, rand },
            alphabet
        });

    } catch (error) {
        console.error('Error fetching data:', error.response?.data || error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Komik',
            site_desc: 'Gagal mendapatkan data, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
