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

        const apiUrl = `${process.env.BASE_URL}/v1/komik/chapter/${slug}`;
        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY }
        });

        const { title, data, prevChapter, nextChapter, comicSlug: apiComicSlug } = response.data;

        const comicSlug = apiComicSlug || slug.replace(/-chapter-.*$/i, '');
        let comicTitle = (title || '').replace(/\s*Chapter\s*\d+.*$/i, '').trim();
        if (!comicTitle || comicTitle === title) {
            comicTitle = comicSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }

        // Smart fallback if API didn't provide prev/next
        let resolvedPrevChapter = prevChapter;
        let resolvedNextChapter = nextChapter;

        if (resolvedPrevChapter === undefined && resolvedNextChapter === undefined) {
            const match = slug.match(/^(.*)-chapter-(\d+(?:\.\d+)?)$/i);
            if (match) {
                const prefix = match[1];
                const chapterNum = parseFloat(match[2]);
                if (chapterNum > 1) {
                    resolvedPrevChapter = `${prefix}-chapter-${chapterNum - 1}`;
                }
                resolvedNextChapter = `${prefix}-chapter-${chapterNum + 1}`;
            }
        }

        const responseSidebar = await axios.get(`${process.env.BASE_URL}/v1/komik/list?order=rand`, {
            headers: { 'x-api-key': process.env.API_KEY }
        });

        const dataSidebar = responseSidebar.data?.data || [];
        const getDataSidebar = dataSidebar.sort(() => 0.8 - Math.random()).slice(0, 8);

        res.locals = {
            site_title: `${title} | Komik`,
            site_desc: 'Baca chapter komik favorit Anda dengan kualitas terbaik.',
            site_keyword: 'nonton komik, streaming komik, komik chapter, komik sub indo',
            site_url: req.domain,
        };

        res.render('komik-chapter', { 
            data,
            comicSlug,
            comicTitle,
            prevChapter: resolvedPrevChapter || null,
            nextChapter: resolvedNextChapter || null,
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
