const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const { slug } = req.params;
        
        if (!slug) {
            return res.status(400).render('404', { 
				site_title: 'Halaman Tidak Ada | Komik',
				site_desc: '',
				site_keyword: '',
				site_url: req.domain
			});
        }

        const apiUrl = `${process.env.BASE_URL}/v1/komik/detail/${slug}`;
        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY }
        });
        const { data, chapters } = response.data;
		
        // Normalize chapter numbers before sorting so range tabs match API variants.
        const rawChapters = chapters || data?.chapters || [];
        const getChapterNumber = (chapter, fallback = 0) => {
            const sources = [chapter.chapter, chapter.title, chapter.slug]
                .filter(value => value !== undefined && value !== null && String(value).trim() !== '');
            for (const source of sources) {
                const match = String(source).match(/(?:chapter|ch)[^\d]*(\d+(\.\d+)?)/i) || String(source).match(/\d+(\.\d+)?/);
                if (match) return parseFloat(match[1] || match[0]);
            }
            return fallback;
        };

        const sortedChapters = [...rawChapters].sort((a, b) => {
            const languageCompare = String(a.languageName || a.language || 'Unknown').localeCompare(String(b.languageName || b.language || 'Unknown'));
            return languageCompare || getChapterNumber(a) - getChapterNumber(b);
        });
        const languageGroups = [];
        const groupsByLanguage = new Map();
        sortedChapters.forEach((chapter) => {
            const key = chapter.language || 'unknown';
            if (!groupsByLanguage.has(key)) {
                const group = { code: key, name: chapter.languageName || key.toUpperCase(), chapters: [] };
                groupsByLanguage.set(key, group);
                languageGroups.push(group);
            }
            groupsByLanguage.get(key).chapters.push(chapter);
        });

        const responseSidebar = await axios.get(`${process.env.BASE_URL}/v1/komik/list?order=rand`, {
			headers: { 'x-api-key': process.env.API_KEY }
		});
		const dataSidebar = responseSidebar.data?.data || [];
		const getDataSidebar = dataSidebar.sort(() => 0.8 - Math.random()).slice(0, 8);
		
        res.locals = {
            site_title: `${data.title} | Komik`,
            site_desc: `${data.description}`,
            site_keyword: 'detail komik, baca komik, daftar komik, baca manga',
            site_url: req.domain,
        };

        res.render('detail-komik', { 
			data, 
			chapters: sortedChapters, 
            languageGroups,
			getDataSidebar 
		});
    } catch (error) {
        console.error('Error fetching data:', error.response?.data || error.message);
        const statusCode = error.response?.status || 500;

        if (statusCode === 404) {
            return res.status(404).render('404', { 
				site_title: 'Halaman Tidak Ada | Komik',
				site_desc: '',
				site_keyword: '',
				site_url: req.domain
			});
        }

        res.status(statusCode).render('500', { 
            site_title: 'Terjadi Kesalahan | Komik',
            site_desc: 'Gagal mendapatkan data, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
