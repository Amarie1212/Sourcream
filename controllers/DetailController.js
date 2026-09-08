const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
        const { slug } = req.params;
        
        if (!slug) {
            return res.status(400).render('404', { 
				site_title: 'Halaman Tidak Ada | Anime',
				site_desc: '',
				site_keyword: '',
				site_url: req.domain
			});
        }

        const apiUrl = `${process.env.BASE_URL}/v1/detail/${slug}`;
        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY }
        });
        const { data } = response.data;

        // Sort episodes ascending (1 to N)
        const rawEpisodes = data.episodesList || [];
        const sortedEpisodes = [...rawEpisodes].sort((a, b) => {
            const matchA = a.slug ? a.slug.match(/episode-(\d+(\.\d+)?)/i) : (a.title ? a.title.match(/\d+(\.\d+)?/) : null);
            const matchB = b.slug ? b.slug.match(/episode-(\d+(\.\d+)?)/i) : (b.title ? b.title.match(/\d+(\.\d+)?/) : null);
            const numA = matchA ? parseFloat(matchA[1] || matchA[0]) : 0;
            const numB = matchB ? parseFloat(matchB[1] || matchB[0]) : 0;
            return numA - numB;
        });

        const responseSidebar = await axios.get(`${process.env.BASE_URL}/v1/list?order=populer`, {
			headers: { 'x-api-key': process.env.API_KEY }
		});
		const dataSidebar = responseSidebar.data?.data || [];
		const getDataSidebar = dataSidebar.sort(() => 0.8 - Math.random()).slice(0, 8);
		
        res.locals = {
            site_title: `${data.title} | Anime`,
            site_desc: `${data.description}`,
            site_keyword: 'detail anime, nonton anime, daftar anime, streaming anime',
            site_url: req.domain,
        };

        res.render('detail', { 
			data, 
			episodes: sortedEpisodes, 
			getDataSidebar 
		});
    } catch (error) {
        console.error('Error fetching data:', error.response?.data || error.message);
        const statusCode = error.response?.status || 500;

        if (statusCode === 404) {
            return res.status(404).render('404', { 
				site_title: 'Halaman Tidak Ada | Anime',
				site_desc: '',
				site_keyword: '',
				site_url: req.domain
			});
        }

        res.status(statusCode).render('500', { 
            site_title: 'Terjadi Kesalahan | Anime',
            site_desc: 'Gagal mendapatkan data, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
