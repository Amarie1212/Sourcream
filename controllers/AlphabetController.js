const axios = require('axios');
require('dotenv').config();

exports.index = async (req, res) => {
    try {
		const show = req.query.show || "A";
        const page = parseInt(req.query.page) || 1;
        const apiUrl = `${process.env.BASE_URL}/v1/alphabet?show=${show}&page=${page}`;

        const response = await axios.get(apiUrl, {
            headers: { 'x-api-key': process.env.API_KEY }
        });
        let { data } = response.data;

        if (show === '#' && (!data || data.length === 0)) {
            const numberedAnime = [
                ['+Himitsu no AiPri 3rd Season', 'himitsu-no-aipri-3rd-season'],
                ['0 Years Old Child Starting Dash Story Season 2', '0-years-old-child-starting-dash-story-season-2'],
                ['0-saiji Start Dash Monogatari', '0-saiji-start-dash-monogatari'],
                ['100 Meters', '100-meters'],
                ['2.5 Dimensional Seduction', '2-5-dimensional-seduction'],
                ['86 Eighty-Six', '86-eighty-six']
            ];
            const detailResults = await Promise.all(numberedAnime.map(async ([title, slug]) => {
                try {
                    const detailResponse = await axios.get(`${process.env.BASE_URL}/v1/detail/${slug}`, {
                        headers: { 'x-api-key': process.env.API_KEY },
                        timeout: 8000
                    });
                    return { title, slug, image: detailResponse.data?.data?.imageUrl || '/assets/images/no-img.jpg', status: 'Sedang Tayang' };
                } catch (error) {
                    return { title, slug, image: '/assets/images/no-img.jpg', status: 'Sedang Tayang' };
                }
            }));
            data = detailResults;
        }
		
		const response2 = await axios.get('http://localhost:3000/v1/filter/alphabet', {
            headers: { 'x-api-key': process.env.API_KEY }
        });
        const alphabet = response2.data.data;
		
		const queryParams = new URLSearchParams({ show });
        const nextPage = show === '#' ? null : (data.length > 0 ? `?${queryParams.toString()}&page=${page + 1}` : null);
        const prevPage = page > 1 ? `?${queryParams.toString()}&page=${page - 1}` : null;

        res.render('alphabet', { 
            site_title: `Berdasarkan ${show} | Anime`,
            site_desc: '',
			site_keyword: '',
            site_url: req.domain,
            data: data,
			show,
			alphabet,
            nextPage,
            prevPage,
            currentPage: page
        });
    } catch (error) {
        console.error('Error fetching data:', error.response?.data || error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Anime',
            site_desc: 'Gagal mendapatkan data, coba lagi nanti',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
