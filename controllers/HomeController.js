const axios = require('axios');
require('dotenv').config();

const SPOTLIGHT_ITEMS = [
    {
        title: 'Solo Leveling',
        slug: 'solo-leveling',
        image: 'https://ww4.gogoanimes.fi/poster/1725181705-5539-142390.jpg',
        type: 'TV',
        episodes: 'Full HD',
        desc: 'Kisah Sung Jin-woo, hunter peringkat E terlemah yang mendapatkan kesempatan kedua melalui sistem rahasia yang memungkinkannya naik level tanpa batas.'
    },
    {
        title: 'One Piece',
        slug: 'one-piece',
        image: 'https://ww4.gogoanimes.fi/poster/One-Piece-Elbaph-arc-Key-Visual-9anime.webp',
        type: 'TV',
        episodes: 'Full HD',
        desc: 'Petualangan Monkey D. Luffy dan Bajak Laut Topi Jerami mengarungi Grand Line untuk menemukan harta karun legendaris One Piece dan menjadi Raja Bajak Laut.'
    },
    {
        title: 'Demon Slayer: Kimetsu no Yaiba Infinity Castle',
        slug: 'demon-slayer-kimetsu-no-yaiba-infinity-castle',
        image: 'https://ww4.gogoanimes.fi/poster/1725694452-4636-143891.jpg',
        type: 'MOVIE',
        episodes: 'Full HD',
        desc: 'Pertarungan klimaks Tanjiro Kamado dan Korps Pembasmi Iblis melawan Kibutsuji Muzan di dalam dimensi kastil tak terbatas yang misterius.'
    },
    {
        title: 'Attack on Titan: Final Season – The Final Chapters',
        slug: 'attack-on-titan-final-season-the-final-chapters',
        image: 'https://ww4.gogoanimes.fi/poster/1730867536-7044-131078.jpg',
        type: 'TV',
        episodes: 'Full HD',
        desc: 'Babak akhir peperangan dahsyat antara Pulau Paradis dan Marley, mengiringi tekad Eren Yeager dalam menentukan takdir dunia melalui Rumbling.'
    },
    {
        title: 'Jujutsu Kaisen: Hidden Inventory / Premature Death',
        slug: 'jujutsu-kaisen-hidden-inventory-premature-death',
        image: 'https://ww4.gogoanimes.fi/poster/1766491847-1366-JUJUTSU-KAISEN-Hidden-Inventory-Premature-Death-E28093-The-Movie.webp',
        type: 'TV',
        episodes: 'Full HD',
        desc: 'Masa lalu Satoru Gojo dan Suguru Geto saat masih menjadi murid di SMA Jujutsu Tokyo dalam menjalankan misi rahasia pengawalan Wadah Plasma Bintang.'
    },
    {
        title: 'Chainsaw Man',
        slug: 'chainsaw-man',
        image: 'https://ww4.gogoanimes.fi/poster/1725304180-9889-126216.jpg',
        type: 'TV',
        episodes: 'Full HD',
        desc: 'Denji, seorang pemuda miskin yang hidup bersama iblis gergaji Pochita, terlahir kembali sebagai Chainsaw Man setelah membuat kontrak rahasia pemburu iblis.'
    },
    {
        title: 'Spy x Family',
        slug: 'spy-x-family',
        image: 'https://ww4.gogoanimes.fi/poster/1725300783-3995-122795.jpg',
        type: 'TV',
        episodes: 'Full HD',
        desc: 'Agen rahasia Twilight menyamar sebagai Loid Forger dan membangun keluarga palsu bersama seorang pembunuh bayaran Yor dan anak cenayang pembaca pikiran Anya.'
    },
    {
        title: 'Hunter x Hunter',
        slug: 'hunter-x-hunter',
        image: 'https://ww4.gogoanimes.fi/poster/1727716569-1664-99013.jpg',
        type: 'TV',
        episodes: 'Full HD',
        desc: 'Gon Freecss memulai petualangan epik menjadi Pro Hunter demi menemukan ayahnya, Ging, menghadapi berbagai musuh mematikan dan ujian tak terduga.'
    }
];

exports.index = async (req, res) => {
    try {
        const fetchSection = async (order) => {
            try {
                const r = await axios.get(`${process.env.BASE_URL}/v1/list?order=${order}`, {
                    headers: { 'x-api-key': process.env.API_KEY },
                    timeout: 10000
                });
                return (r.data?.data || []).slice(0, 10);
            } catch (err) {
                console.error(`Failed to fetch section ${order}:`, err.message);
                return [];
            }
        };

        const fetchAlphabet = async () => {
            try {
                const r = await axios.get(`${process.env.BASE_URL}/v1/filter/alphabet`, {
                    headers: { 'x-api-key': process.env.API_KEY },
                    timeout: 8000
                });
                return r.data?.data || [];
            } catch (err) {
                return [];
            }
        };

        // Fetch all 5 anime sections + alphabet concurrently
        const [
            latestEpisodes,
            newSeason,
            popular,
            newMovies,
            popularMovies,
            alphabet
        ] = await Promise.all([
            fetchSection('baru'),
            fetchSection('season'),
            fetchSection('populer'),
            fetchSection('movie_terbaru'),
            fetchSection('movie_populer'),
            fetchAlphabet()
        ]);

        res.render('home', { 
            site_title: 'Beranda | Sourcream Anime Streaming',
            site_desc: 'Nonton streaming anime dan film bioskop anime sub indo full HD gratis bebas iklan di Sourcream.',
            site_keyword: 'anime, nonton anime, anime sub indo, episode terbaru, anime movie, stream anime',
            site_url: req.domain,
            data: { 
                spotlight: SPOTLIGHT_ITEMS,
                latestEpisodes,
                newSeason,
                popular,
                newMovies,
                popularMovies
            },
            alphabet 
        });

    } catch (error) {
        console.error('HomeController Error:', error.message);
        res.status(500).render('500', { 
            site_title: 'Terjadi Kesalahan | Anime',
            site_desc: 'Gagal memuat data beranda anime, coba lagi nanti.',
            site_keyword: 'error',
            site_url: req.domain,
        });
    }
};
