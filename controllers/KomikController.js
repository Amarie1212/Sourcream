const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const fetchSection = async (order, type = '') => {
            try {
                let url = `${process.env.BASE_URL}/v1/komik/list?order=${order}&limit=10`;
                if (type) url += `&type=${type}`;
                const r = await axios.get(url, {
                    headers: { 'x-api-key': process.env.API_KEY },
                    timeout: 10000
                });
                return (r.data?.data || []).slice(0, 10);
            } catch (err) {
                console.error(`Failed to fetch komik section ${order} ${type}:`, err.message);
                return [];
            }
        };

        // Fetch 5 comic sections in parallel
        const [
            latestChapters,
            newManga,
            popularManga,
            topRated,
            popularManhwa
        ] = await Promise.all([
            fetchSection('update'),
            fetchSection('baru'),
            fetchSection('populer'),
            fetchSection('peringkat'),
            fetchSection('populer', 'manhwa')
        ]);
		
        const alphabet = Array.from({ length: 26 }, (_, i) => {
            const letter = String.fromCharCode(65 + i);
            return { slug: letter, title: letter };
        });

        res.render('komik', { 
            site_title: 'Beranda | Sourcream Baca Komik Online',
            site_desc: 'Baca komik manga, manhwa, dan manhua bahasa Indonesia & English gratis terupdate di Sourcream.',
            site_keyword: 'komik, baca komik, manga, manhwa, webtoon, komik terbaru, komik populer',
            site_url: req.domain,
            data: { 
                latestChapters,
                newManga,
                popularManga,
                topRated,
                popularManhwa
            },
            alphabet
        });

    } catch (error) {
        console.error('KomikController Error:', error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Komik',
            site_desc: 'Gagal memuat katalog komik, coba lagi nanti.',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
