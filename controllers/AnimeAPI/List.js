const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const { setCache } = require('../../middlewares/CacheAPI');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const GOGO_BASE = 'https://ww4.gogoanimes.fi';

// Known working fallback posters for items that have 0-byte ghost files on Gogoanime CDN
const POSTER_FALLBACKS = {
  'kaiju-no-8': 'https://ww4.gogoanimes.fi/poster/Kaiju-No-8-Season-2.webp',
  'kaiju-no-8-narumi-s-week-at-work': 'https://ww4.gogoanimes.fi/poster/Kaiju-No-8-Season-2.webp',
  'sound-euphonium-the-final-movie-part-1': 'https://upload.wikimedia.org/wikipedia/en/6/6f/Third_Sound%21_Euphonium_film_poster.jpg',
  'saishuu-gakushou-hibike-euphonium-zenpen': 'https://upload.wikimedia.org/wikipedia/en/6/6f/Third_Sound%21_Euphonium_film_poster.jpg',
  'mobile-suit-gundam-hathaway-s-flash': 'https://ww4.gogoanimes.fi/poster/1786958210-1049-154129.jpg',
  'the-last-blossom': 'https://upload.wikimedia.org/wikipedia/en/3/31/The_Last_Blossom_film_poster.jpg',
  'perfect-world-movie-ninefold-the-burning-sky': 'https://ww4.gogoanimes.fi/poster/1726495709-5967-145386.jpg',
  'gintama-movie-3-yoshiwara-in-flames': 'https://ww4.gogoanimes.fi/poster/1759749795-1024-Gintama-Mr.-Ginpachis-Zany-Class.webp',
  'tenki-no-ko': 'https://ww4.gogoanimes.fi/poster/1728620844-7789-101146.jpg',
  'weathering-with-you': 'https://ww4.gogoanimes.fi/poster/1728620844-7789-101146.jpg',
  'suzume': '/assets/images/suzume.jpg',
  'suzume-no-tojimari': '/assets/images/suzume.jpg'
};

const BROKEN_IMG_PATTERNS = [
  '1788611904-1822-159343',
  '1788516872-5780-saishuu-gakushou-hibike-euphonium-zenpen',
  '1788125813-3401-115685',
  '1788001311-8338-150934',
  '1787805163-7388-159390',
  '1787758980-3843-154487'
];

function resolvePoster(slug, rawImg) {
  if (!rawImg || rawImg.trim() === '' || rawImg.endsWith('/no-img.jpg')) {
    for (const [key, fallback] of Object.entries(POSTER_FALLBACKS)) {
      if (slug && (slug.includes(key) || key.includes(slug))) return fallback;
    }
  }

  if (POSTER_FALLBACKS[slug]) return POSTER_FALLBACKS[slug];

  for (const b of BROKEN_IMG_PATTERNS) {
    if (rawImg && rawImg.includes(b)) {
      for (const [key, fallback] of Object.entries(POSTER_FALLBACKS)) {
        if (slug && (slug.includes(key) || key.includes(slug))) return fallback;
      }
    }
  }

  for (const [key, fallback] of Object.entries(POSTER_FALLBACKS)) {
    if (slug && slug.includes(key)) return fallback;
  }

  return rawImg;
}

// -------------------------------------------------------------
// 3. POPULAR ANIME SERIES (SERIAL TV ANIME TERPOPULER / RATING TINGGI - BUKAN MOVIE)
// -------------------------------------------------------------
const POPULAR_SERIES_LIST = [
  {
    title: 'Solo Leveling',
    slug: 'solo-leveling',
    image: 'https://ww4.gogoanimes.fi/poster/1725181705-5539-142390.jpg',
    episodes: 'Rating ★ 9.3',
    status: 'Trending TV',
    type: 'TV'
  },
  {
    title: 'Jujutsu Kaisen: Hidden Inventory / Premature Death',
    slug: 'jujutsu-kaisen-hidden-inventory-premature-death',
    image: 'https://ww4.gogoanimes.fi/poster/1766491847-1366-JUJUTSU-KAISEN-Hidden-Inventory-Premature-Death-E28093-The-Movie.webp',
    episodes: 'Rating ★ 9.2',
    status: 'Trending TV',
    type: 'TV'
  },
  {
    title: 'Demon Slayer: Kimetsu no Yaiba',
    slug: 'demon-slayer-kimetsu-no-yaiba-infinity-castle',
    image: 'https://ww4.gogoanimes.fi/poster/1725694452-4636-143891.jpg',
    episodes: 'Rating ★ 9.1',
    status: 'Trending TV',
    type: 'TV'
  },
  {
    title: 'Attack on Titan: Final Season',
    slug: 'attack-on-titan-final-season-the-final-chapters',
    image: 'https://ww4.gogoanimes.fi/poster/1730867536-7044-131078.jpg',
    episodes: 'Rating ★ 9.4',
    status: 'Masterpiece',
    type: 'TV'
  },
  {
    title: 'One Piece',
    slug: 'one-piece',
    image: 'https://ww4.gogoanimes.fi/poster/One-Piece-Elbaph-arc-Key-Visual-9anime.webp',
    episodes: 'Rating ★ 9.1',
    status: 'Ongoing TV',
    type: 'TV'
  },
  {
    title: 'Frieren: Beyond Journey’s End',
    slug: 'frieren-beyond-journey-s-end-season-2',
    image: 'https://ww4.gogoanimes.fi/poster/Frieren-Beyond-Journeys-End-Season-2-visual-2.webp',
    episodes: 'Rating ★ 9.5',
    status: 'Top Rated TV',
    type: 'TV'
  },
  {
    title: 'Chainsaw Man',
    slug: 'chainsaw-man',
    image: 'https://ww4.gogoanimes.fi/poster/1725304180-9889-126216.jpg',
    episodes: 'Rating ★ 8.9',
    status: 'Popular TV',
    type: 'TV'
  },
  {
    title: 'Bleach: Thousand-Year Blood War',
    slug: 'bleach-thousand-year-blood-war-the-calamity',
    image: 'https://ww4.gogoanimes.fi/poster/Bleach-Thousand-Year-Blood-War-The-Calamity-Movie.webp',
    episodes: 'Rating ★ 9.2',
    status: 'Trending TV',
    type: 'TV'
  },
  {
    title: 'Spy x Family',
    slug: 'spy-x-family',
    image: 'https://ww4.gogoanimes.fi/poster/1725300783-3995-122795.jpg',
    episodes: 'Rating ★ 8.8',
    status: 'Popular TV',
    type: 'TV'
  },
  {
    title: 'Hunter x Hunter',
    slug: 'hunter-x-hunter',
    image: 'https://ww4.gogoanimes.fi/poster/1727716569-1664-99013.jpg',
    episodes: 'Rating ★ 9.3',
    status: 'Masterpiece',
    type: 'TV'
  },
  {
    title: 'Dandadan',
    slug: 'dandadan-season-2',
    image: 'https://ww4.gogoanimes.fi/poster/Dandadan-Season-2.webp',
    episodes: 'Rating ★ 9.0',
    status: 'Trending TV',
    type: 'TV'
  },
  {
    title: 'Kaiju No. 8',
    slug: 'kaiju-no-8-season-2',
    image: 'https://ww4.gogoanimes.fi/poster/Kaiju-No-8-Season-2.webp',
    episodes: 'Rating ★ 8.9',
    status: 'Popular TV',
    type: 'TV'
  },
  {
    title: 'Death Note',
    slug: 'death-note',
    image: 'https://ww4.gogoanimes.fi/poster/1725472392-5785-138100.jpg',
    episodes: 'Rating ★ 9.2',
    status: 'Masterpiece',
    type: 'TV'
  },
  {
    title: 'Naruto Shippuden',
    slug: 'naruto-shippuden',
    image: 'https://ww4.gogoanimes.fi/poster/1725272156-8049-111305.jpg',
    episodes: 'Rating ★ 9.0',
    status: 'Legendary TV',
    type: 'TV'
  },
  {
    title: 'Black Clover',
    slug: 'black-clover',
    image: 'https://ww4.gogoanimes.fi/poster/1725285768-7832-88336.jpg',
    episodes: 'Rating ★ 8.7',
    status: 'Popular TV',
    type: 'TV'
  },
  {
    title: 'Fullmetal Alchemist: Brotherhood',
    slug: 'fullmetal-alchemist-brotherhood',
    image: 'https://ww4.gogoanimes.fi/poster/1725304180-9889-126216.jpg',
    episodes: 'Rating ★ 9.5',
    status: 'Masterpiece',
    type: 'TV'
  },
  {
    title: 'Mashle: Magic and Muscles',
    slug: 'mashle-magic-and-muscles',
    image: 'https://ww4.gogoanimes.fi/poster/1734613107-8886-135107.jpg',
    episodes: 'Rating ★ 8.6',
    status: 'Popular TV',
    type: 'TV'
  },
  {
    title: 'My Hero Academia',
    slug: 'my-hero-academia-i-am-a-hero-too',
    image: 'https://ww4.gogoanimes.fi/poster/My-Hero-Academia-I-Am-a-Hero-Too.webp',
    episodes: 'Rating ★ 8.8',
    status: 'Popular TV',
    type: 'TV'
  },
  {
    title: 'Blue Lock',
    slug: 'blue-lock-episode-nagi',
    image: 'https://ww4.gogoanimes.fi/poster/1725500006-1447-139928.jpg',
    episodes: 'Rating ★ 8.7',
    status: 'Popular TV',
    type: 'TV'
  },
  {
    title: 'Oshi no Ko',
    slug: 'oshi-no-ko',
    image: 'https://ww4.gogoanimes.fi/poster/1725300783-3995-122795.jpg',
    episodes: 'Rating ★ 9.0',
    status: 'Trending TV',
    type: 'TV'
  }
];

// -------------------------------------------------------------
// -------------------------------------------------------------
// 5. POPULAR MOVIES (FILM BIOSKOP ANIME POPULER - BUKAN TV SERIES)
// -------------------------------------------------------------
const POPULAR_MOVIES_LIST = [
  // Page 1 (1-10)
  {
    title: 'Demon Slayer: Kimetsu no Yaiba – The Movie: Mugen Train',
    slug: 'demon-slayer-kimetsu-no-yaiba-the-movie-mugen-train',
    image: 'https://ww4.gogoanimes.fi/poster/1725212215-2377-106947.jpg',
    episodes: 'Top Rating ★ 9.1',
    status: 'Blockbuster',
    type: 'MOVIE'
  },
  {
    title: 'Jujutsu Kaisen 0: The Movie',
    slug: 'jujutsu-kaisen-0',
    image: 'https://ww4.gogoanimes.fi/poster/1725416458-8637-119044.jpg',
    episodes: 'Top Rating ★ 9.0',
    status: 'Blockbuster',
    type: 'MOVIE'
  },
  {
    title: 'Kimi no Na wa. (Your Name.)',
    slug: 'your-name',
    image: 'https://ww4.gogoanimes.fi/poster/1725281963-7851-87048.jpg',
    episodes: 'Top Rating ★ 9.3',
    status: 'Masterpiece',
    type: 'MOVIE'
  },
  {
    title: 'Suzume no Tojimari (Suzume)',
    slug: 'suzume',
    image: '/assets/images/suzume.jpg',
    episodes: 'Top Rating ★ 8.8',
    status: 'Popular Movie',
    type: 'MOVIE'
  },
  {
    title: 'Koe no Katachi (A Silent Voice)',
    slug: 'a-silent-voice',
    image: 'https://ww4.gogoanimes.fi/poster/1725280905-1808-96435.jpg',
    episodes: 'Top Rating ★ 9.2',
    status: 'Masterpiece',
    type: 'MOVIE'
  },
  {
    title: 'One Piece Film: Red',
    slug: 'one-piece-film-red',
    image: 'https://ww4.gogoanimes.fi/poster/1725271433-7458-125323.jpg',
    episodes: 'Top Rating ★ 8.9',
    status: 'Popular Movie',
    type: 'MOVIE'
  },
  {
    title: 'Spirited Away (Sen to Chihiro no Kamikakushi)',
    slug: 'spirited-away',
    image: 'https://ww4.gogoanimes.fi/poster/1725282576-2059-79597.jpg',
    episodes: 'Top Rating ★ 9.4',
    status: 'Oscar Winner',
    type: 'MOVIE'
  },
  {
    title: 'The First Slam Dunk',
    slug: 'the-first-slam-dunk',
    image: 'https://ww4.gogoanimes.fi/poster/1725282982-9583-129284.jpg',
    episodes: 'Top Rating ★ 9.0',
    status: 'Popular Movie',
    type: 'MOVIE'
  },
  {
    title: 'Weathering With You (Tenki no Ko)',
    slug: 'weathering-with-you',
    image: 'https://ww4.gogoanimes.fi/poster/1728620844-7789-101146.jpg',
    episodes: 'Top Rating ★ 8.7',
    status: 'Popular Movie',
    type: 'MOVIE'
  },
  {
    title: 'Detective Conan Movie 27: The Million-Dollar Pentagram',
    slug: 'detective-conan-movie-27',
    image: 'https://ww4.gogoanimes.fi/poster/1755140199-9921-141209.jpg',
    episodes: 'Top Rating ★ 8.8',
    status: 'Popular Movie',
    type: 'MOVIE'
  },
  // Page 2 (11-20)
  {
    title: 'Dragon Ball Super: Broly',
    slug: 'dragon-ball-super-broly',
    image: 'https://ww4.gogoanimes.fi/poster/1727706713-8840-93498.jpg',
    episodes: 'Top Rating ★ 8.9',
    status: 'Action Blockbuster',
    type: 'MOVIE'
  },
  {
    title: 'Haikyu!! Movie: The Dumpster Battle',
    slug: 'haikyu-movie-the-dumpster-battle',
    image: 'https://ww4.gogoanimes.fi/poster/1730357362-7459-140360.jpg',
    episodes: 'Top Rating ★ 8.9',
    status: 'Popular Movie',
    type: 'MOVIE'
  },
  {
    title: 'Howl’s Moving Castle',
    slug: 'howl-s-moving-castle',
    image: 'https://ww4.gogoanimes.fi/poster/1725283536-2137-138723.jpg',
    episodes: 'Top Rating ★ 9.3',
    status: 'Ghibli Classic',
    type: 'MOVIE'
  },
  {
    title: 'Princess Mononoke',
    slug: 'princess-mononoke',
    image: 'https://ww4.gogoanimes.fi/poster/1725283799-9178-75919.jpg',
    episodes: 'Top Rating ★ 9.3',
    status: 'Ghibli Classic',
    type: 'MOVIE'
  },
  {
    title: 'I Want to Eat Your Pancreas',
    slug: 'i-want-to-eat-your-pancreas',
    image: 'https://ww4.gogoanimes.fi/poster/1725286532-6288-93291.jpg',
    episodes: 'Top Rating ★ 8.9',
    status: 'Emotional Drama',
    type: 'MOVIE'
  },
  {
    title: 'Violet Evergarden: The Movie',
    slug: 'violet-evergarden-the-movie',
    image: 'https://ww4.gogoanimes.fi/poster/1725281603-3313-110716.jpg',
    episodes: 'Top Rating ★ 9.1',
    status: 'Masterpiece',
    type: 'MOVIE'
  },
  {
    title: 'Bleach: Thousand-Year Blood War – The Calamity Movie',
    slug: 'bleach-thousand-year-blood-war-the-calamity-movie',
    image: 'https://ww4.gogoanimes.fi/poster/Bleach-Thousand-Year-Blood-War-The-Calamity-Movie.webp',
    episodes: 'Top Rating ★ 9.2',
    status: 'Trending Movie',
    type: 'MOVIE'
  },
  {
    title: 'That Time I Got Reincarnated as a Slime: Tears of the Azure Sea',
    slug: 'that-time-i-got-reincarnated-as-a-slime-the-movie-tears-of-the-azure-sea',
    image: 'https://ww4.gogoanimes.fi/poster/1782460435-7135-153665.jpg',
    episodes: 'Top Rating ★ 8.7',
    status: 'Fantasy Movie',
    type: 'MOVIE'
  },
  {
    title: 'Assassination Classroom the Movie: Our Time',
    slug: 'assassination-classroom-the-movie-our-time',
    image: 'https://ww4.gogoanimes.fi/poster/1784884992-4188-154288.jpg',
    episodes: 'Top Rating ★ 8.8',
    status: 'Popular Movie',
    type: 'MOVIE'
  },
  {
    title: 'Saga of Tanya the Evil: The Movie',
    slug: 'saga-of-tanya-the-evil-the-movie',
    image: 'https://ww4.gogoanimes.fi/poster/1782052772-8677-117182.jpg',
    episodes: 'Top Rating ★ 8.7',
    status: 'Action Movie',
    type: 'MOVIE'
  }
];

exports.index = async (req, res) => {
  try {
    const { order = 'default' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;

    let results = [];

    if (order === 'movie_populer' || order === 'popular_movie') {
      // 5. POPULAR MOVIES: Only popular anime movies with pagination support
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      const pagedMovies = POPULAR_MOVIES_LIST.slice(startIndex, endIndex);

      if (pagedMovies.length > 0) {
        results = pagedMovies.map(item => ({
          ...item,
          image: resolvePoster(item.slug, item.image),
          type: 'MOVIE'
        }));
      } else {
        // Fallback: scrape anime movies from catalog for pages beyond curated list
        try {
          const fallbackRes = await axios.get(`${GOGO_BASE}/anime-movies.html?page=${page - 2}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            httpsAgent,
            timeout: 10000
          });
          const $ = cheerio.load(fallbackRes.data);
          $('.last_episodes ul.items li, ul.items li').slice(0, 10).each((i, el) => {
            const rawTitle = $(el).find('.name a').attr('title') || $(el).find('.name a').text().trim();
            const rawHref = $(el).find('.name a').attr('href') || '';
            const slug = rawHref.replace(/^\/?category\//, '').replace(/^\//, '').trim();
            let image = $(el).find('.img img').attr('src') || '';
            if (image && !image.startsWith('http')) {
              image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
            }
            image = resolvePoster(slug, image);
            const isDub = rawTitle.toLowerCase().includes('(dub)');
            if (slug && rawTitle) {
              results.push({
                title: rawTitle,
                slug,
                image,
                episodes: 'Top Rating ★ ' + (8.5 - (i * 0.05)).toFixed(1),
                status: isDub ? 'Dub' : 'Sub',
                type: 'MOVIE'
              });
            }
          });
        } catch (err) {
          console.error('movie_populer fallback scrape error:', err.message);
        }
      }
    } else if (order === 'movie_terbaru' || order === 'movie' || order === 'movies') {
      // 4. NEW MOVIES: Scrape newest anime movies (film bioskop anime yang baru)
      const url = `${GOGO_BASE}/anime-movies.html?page=${page}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        httpsAgent,
        timeout: 12000
      });

      const $ = cheerio.load(response.data);
      $('.last_episodes ul.items li, ul.items li').each((i, el) => {
        const rawTitle = $(el).find('.name a').attr('title') || $(el).find('.name a').text().trim();
        const rawHref = $(el).find('.name a').attr('href') || '';
        const slug = rawHref.replace(/^\/?category\//, '').replace(/^\//, '').trim();

        let image = $(el).find('.img img').attr('src') || '';
        if (image && !image.startsWith('http')) {
          image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
        }
        image = resolvePoster(slug, image);

        const released = $(el).find('.released').text().replace(/^Updated:\s*/i, '').trim();
        const isDub = rawTitle.toLowerCase().includes('(dub)');

        if (slug && rawTitle) {
          results.push({
            title: rawTitle,
            slug,
            image,
            episodes: released || 'Baru Rilis',
            status: isDub ? 'Dub' : 'Sub',
            type: 'MOVIE'
          });
        }
      });

    } else if (order === 'season' || order === 'musim-baru') {
      // 2. NEW ANIME (Season saat ini): Scrape new season anime series
      const url = `${GOGO_BASE}/new-season.html?page=${page}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        httpsAgent,
        timeout: 12000
      });

      const $ = cheerio.load(response.data);
      $('.last_episodes ul.items li, ul.items li').each((i, el) => {
        const rawTitle = $(el).find('.name a').attr('title') || $(el).find('.name a').text().trim();
        const rawHref = $(el).find('.name a').attr('href') || '';
        const slug = rawHref.replace(/^\/?category\//, '').replace(/^\//, '').trim();

        // Strictly exclude movies from Season Anime Series
        const isMovie = rawTitle.toLowerCase().includes('movie') || slug.toLowerCase().includes('movie');
        if (isMovie) return;

        let image = $(el).find('.img img').attr('src') || '';
        if (image && !image.startsWith('http')) {
          image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
        }
        image = resolvePoster(slug, image);

        const rawReleased = $(el).find('.released').text().replace(/^Updated:\s*/i, '').trim();
        const isDub = rawTitle.toLowerCase().includes('(dub)');

        let timestamp = 0;
        if (rawReleased) {
          const parsed = Date.parse(rawReleased);
          if (!isNaN(parsed)) timestamp = parsed;
        }

        if (slug && rawTitle) {
          results.push({
            title: rawTitle,
            slug,
            image,
            episodes: rawReleased || 'Musim Ini',
            releasedDate: rawReleased,
            timestamp,
            status: isDub ? 'Dub' : 'Sub',
            type: isDub ? 'DUB' : 'TV',
            isSeason: true
          });
        }
      });

      // Sort descending by release timestamp
      results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    } else if (order === 'populer' || order === 'popular') {
      // 3. ANIME TERPOPULER: STRICTLY TV SERIES (BUKAN MOVIE!)
      // Return paginated slices of curated top popular anime series
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      const pagedSeries = POPULAR_SERIES_LIST.slice(startIndex, endIndex);

      if (pagedSeries.length > 0) {
        results = pagedSeries.map(item => ({
          ...item,
          image: resolvePoster(item.slug, item.image),
          type: 'TV'
        }));
      } else {
        // Fallback: scrape new season, filtering OUT all movies
        try {
          const fallbackRes = await axios.get(`${GOGO_BASE}/new-season.html?page=${page}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            httpsAgent,
            timeout: 10000
          });
          const $ = cheerio.load(fallbackRes.data);
          $('.last_episodes ul.items li, ul.items li').each((i, el) => {
            const rawTitle = $(el).find('.name a').attr('title') || $(el).find('.name a').text().trim();
            const rawHref = $(el).find('.name a').attr('href') || '';
            const slug = rawHref.replace(/^\/?category\//, '').replace(/^\//, '').trim();

            const isMovie = rawTitle.toLowerCase().includes('movie') || slug.toLowerCase().includes('movie');
            if (isMovie) return; // STRICTLY NO MOVIES!

            let image = $(el).find('.img img').attr('src') || '';
            if (image && !image.startsWith('http')) {
              image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
            }
            image = resolvePoster(slug, image);
            if (slug && rawTitle) {
              results.push({
                title: rawTitle,
                slug,
                image,
                episodes: 'Populer TV',
                status: 'Trending TV',
                type: 'TV'
              });
            }
          });
        } catch(e) {}
      }

    } else if (order === 'peringkat' || order === 'rating') {
      // TOP RATING ANIME: STRICTLY TV SERIES (BUKAN MOVIE!)
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pagedSeries = POPULAR_SERIES_LIST.slice(startIndex, endIndex);

      results = pagedSeries.map(item => ({
        ...item,
        image: resolvePoster(item.slug, item.image),
        type: 'TV',
        status: 'Top Rated TV'
      }));

    } else {
      // 1. LATEST EPISODES: Scrape live newly released episodes
      const url = `${GOGO_BASE}/ajax/page-recent-release?page=${page}&type=1`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${GOGO_BASE}/`
        },
        httpsAgent,
        timeout: 12000
      });

      const $ = cheerio.load(response.data);
      $('ul.items li').each((i, el) => {
        const rawTitle = $(el).find('.name a').attr('title') || $(el).find('.name a').text().trim();
        const rawHref = $(el).find('.name a').attr('href') || '';
        const epSlug = rawHref.replace(/^\//, '').trim();
        const animeSlug = epSlug.replace(/-episode-\d+.*$/, '');

        let image = $(el).find('.img img').attr('src') || '';
        if (image && !image.startsWith('http')) {
          image = `${GOGO_BASE}${image.startsWith('/') ? '' : '/'}${image}`;
        }
        image = resolvePoster(animeSlug, image);

        const episodes = $(el).find('.episode').text().trim();
        const isDub = rawTitle.toLowerCase().includes('(dub)');

        if (animeSlug && rawTitle) {
          results.push({
            title: rawTitle,
            slug: animeSlug,
            episodeSlug: epSlug,
            image,
            episodes,
            status: isDub ? 'Dub' : 'Sub',
            type: isDub ? 'DUB' : 'SUB',
            isRecent: true
          });
        }
      });
    }

    const responseData = { success: true, data: results, page };
    setCache(res.cacheKey, responseData);
    res.json(responseData);

  } catch (error) {
    console.error('AnimeAPI List Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data' });
  }
};
