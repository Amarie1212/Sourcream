const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const WatchlistController = require('../controllers/WatchlistController');
const ProgressController = require('../controllers/ProgressController');

router.get('/login', AuthController.loginPage);
router.post('/login', AuthController.login);
router.get('/register', AuthController.registerPage);
router.post('/register', AuthController.register);
router.post('/logout', AuthController.logout);
router.get('/watchlist', WatchlistController.index);
router.post('/api/watchlist', WatchlistController.add);
router.delete('/api/watchlist/:slug', WatchlistController.remove);
router.get('/api/watchlist/:slug/status', WatchlistController.status);
router.post('/api/progress', ProgressController.mark);

// --- 1. Anime Web Routes (Original UI Views powered by Gogoanime) ---
const HomePage = require('../controllers/HomeController');
router.get('/', HomePage.index);

const DetailPage = require('../controllers/DetailController');
router.get('/anime/:slug', DetailPage.index);

const EpisodePage = require('../controllers/EpisodeController');
router.get('/episode/:slug', EpisodePage.index);

const SearchPage = require('../controllers/SearchController');
router.get('/pencarian', SearchPage.index);
router.get('/search', SearchPage.index);
router.get('/api/anime-suggestions', SearchPage.suggestions);

const NewsPage = require('../controllers/NewsController');
router.get('/terbaru', NewsPage.index);
router.get('/musim-baru', (req, res, next) => {
    req.query.order = 'season';
    NewsPage.index(req, res, next);
});

const PopularPage = require('../controllers/PopularController');
router.get('/populer', PopularPage.index);

const MoviePage = require('../controllers/MovieController');
router.get('/movies', MoviePage.index);
router.get('/movie', MoviePage.index);

const OldPage = require('../controllers/OldController');
router.get('/terlama', OldPage.index);

const RangkingPage = require('../controllers/RangkingController');
router.get('/peringkat', RangkingPage.index);

const FilterPage = require('../controllers/FilterController');
router.get('/filter', FilterPage.index);

const Alphabet = require('../controllers/AlphabetController');
router.get('/alphabet', Alphabet.index);

const DocsPage = require('../controllers/DocsController');
router.get('/docs', DocsPage.index);

// Redirect /en aliases to root
router.get('/en', (req, res) => res.redirect('/'));
router.get('/en/anime/:slug', (req, res) => res.redirect(`/anime/${req.params.slug}`));
router.get('/en/episode/:slug', (req, res) => res.redirect(`/episode/${req.params.slug}`));
router.get('/en/search', (req, res) => res.redirect(`/search?q=${encodeURIComponent(req.query.q || '')}`));

// --- 2. Komik Web Routes (MangaDex) ---
// Comics are no longer part of the streaming platform.
router.use('/komik', (req, res) => res.redirect('/'));

const KomikProxy = require('../controllers/KomikProxyController');
router.get('/komik/cover/:mangaId/:fileName', KomikProxy.cover);
router.get('/komik/page-proxy', KomikProxy.pageProxy);

const KomikPage = require('../controllers/KomikController');
router.get('/komik', KomikPage.index);

const KomikNewsPage = require('../controllers/KomikNewsController');
router.get('/komik/terbaru', KomikNewsPage.index);
router.get('/komik/baru', (req, res, next) => {
    req.query.order = 'baru';
    KomikNewsPage.index(req, res, next);
});
router.get('/komik/populer', (req, res, next) => {
    req.query.order = 'populer';
    KomikNewsPage.index(req, res, next);
});
router.get('/komik/manhwa', (req, res, next) => {
    req.query.type = 'manhwa';
    KomikNewsPage.index(req, res, next);
});

const KomikUpdatePage = require('../controllers/KomikUpdateController');
router.get('/komik/terupdate', KomikUpdatePage.index);

const KomikRangkingPage = require('../controllers/KomikRangkingController');
router.get('/komik/peringkat', KomikRangkingPage.index);

const KomikRandomPage = require('../controllers/KomikRandomController');
router.get('/komik/acak', KomikRandomPage.index);

const KomikDetailPage = require('../controllers/KomikDetailController');
router.get('/komik/detail/:slug', KomikDetailPage.index);

const KomikChapterPage = require('../controllers/KomikChapterController');
router.get('/komik/chapter/:slug', KomikChapterPage.index);

const KomikSearchPage = require('../controllers/KomikSearchController');
router.get('/komik/pencarian', KomikSearchPage.index);

const KomikFilterPage = require('../controllers/KomikFilterController');
router.get('/komik/filter', KomikFilterPage.index);

const KomikAlphabetPage = require('../controllers/KomikAlphabetController');
router.get('/komik/alphabet', KomikAlphabetPage.index);

module.exports = router;
