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
        const { data } = response.data;
		
        // Sort chapters ascending (1 to N)
        const rawChapters = data.chapters || [];
        const sortedChapters = [...rawChapters].sort((a, b) => {
            const matchA = a.title ? a.title.match(/\d+(\.\d+)?/) : null;
            const matchB = b.title ? b.title.match(/\d+(\.\d+)?/) : null;
            const numA = matchA ? parseFloat(matchA[0]) : 0;
            const numB = matchB ? parseFloat(matchB[0]) : 0;
            return numA - numB;
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
