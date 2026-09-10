const axios = require('axios');
const https = require('https');
const dns = require('dns');
const cheerio = require('cheerio');

// Custom DNS lookup to bypass Indonesian ISP (XL Axiata, Indihome, etc.) blocking on mangadex.org
function mangadexLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname.endsWith('mangadex.org')) {
    if (options && options.all) {
      return callback(null, [{ address: '45.129.229.1', family: 4 }]);
    }
    return callback(null, '45.129.229.1', 4);
  }
  return dns.lookup(hostname, options, callback);
}

const httpsAgent = new https.Agent({
  lookup: mangadexLookup,
  rejectUnauthorized: false
});

const MD_BASE = 'https://api.mangadex.org';
const KOMIKCAST_BASE = 'https://v1.komikcast.ac';

function normalizeKomikcastImage(image) {
  if (!image || image === '/assets/images/no-img.jpg') return '/assets/images/no-img.jpg';
  if (/komiktap\.info|komiku\.org|komikcast\.ac/i.test(image)) {
    return `/komik/page-proxy?url=${encodeURIComponent(image)}`;
  }
  return image;
}

function getChapterNumber(chapter) {
  const value = chapter?.chapter ?? chapter?.title ?? chapter?.slug ?? '';
  const match = String(value).match(/\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

function formatKomikcastChapter(chapter, mangaSlug) {
  const language = chapter.lang || 'unknown';
  const languageNames = {
    id: 'Indonesia', en: 'English', ja: '日本語', ko: '한국어', zh: '中文',
    es: 'Español', 'es-419': 'Español (Latinoamérica)', fr: 'Français',
    pt: 'Português', de: 'Deutsch', it: 'Italiano', ru: 'Русский'
  };
  const languageName = languageNames[language] || language.toUpperCase();
  const titleNumber = String(chapter.title || '').match(/^\s*(?:chapter\s*)?(\d+(?:\.\d+)?)/i);
  const number = titleNumber?.[1] || chapter.chapter || '0';
  return {
    slug: `${mangaSlug}/${chapter.slug}`,
    chapter: String(number),
    title: `${language === 'id' ? '🇮🇩 ' : language === 'en' ? '🇬🇧 ' : `[${language.toUpperCase()}] `}Chapter ${number}${chapter.title && chapter.title !== String(number) ? `: ${chapter.title}` : ''}`,
    date: chapter.releaseDate ? new Date(chapter.releaseDate).toLocaleDateString('id-ID') : 'Terbaru',
    pages: chapter.pages || 0,
    language: 'id',
    languageName: 'Indonesia',
    complete: chapter.pages !== 0,
    externalUrl: null
  };
}

async function fetchKomikcast(path) {
  const response = await axios.get(`${KOMIKCAST_BASE}${path}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36' },
    timeout: 15000
  });
  return cheerio.load(response.data);
}

function parseKomikcastChapterLinks($, mangaSlug) {
  const chapters = [];
  const seen = new Set();
  $('a').filter((index, element) => String($(element).attr('href') || '').includes('chapter-')).each((index, element) => {
    const href = ($(element).attr('href') || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
    const parts = href.split('/');
    const chapterSlug = parts[parts.length - 1];
    const numberMatch = chapterSlug.match(/chapter-(\d+(?:\.\d+)?)/i) || $(element).text().match(/\d+(?:\.\d+)?/);
    if (!chapterSlug || !numberMatch || seen.has(chapterSlug)) return;
    seen.add(chapterSlug);
    const number = numberMatch[1] || numberMatch[0];
    chapters.push(formatKomikcastChapter({ slug: chapterSlug, chapter: number, title: $(element).text().trim() || `Chapter ${number}` }, mangaSlug));
  });
  return chapters;
}

/**
 * Format MangaDex manga object into Sourcream standard manga format
 */
function formatManga(m) {
  const attrs = m.attributes || {};
  const titleObj = attrs.title || {};
  const title = titleObj.en || titleObj.ja || Object.values(titleObj)[0] || 'Untitled Manga';

  const rels = m.relationships || [];
  const coverRel = rels.find(r => r.type === 'cover_art');
  const coverFileName = coverRel?.attributes?.fileName || '';
  
  // Use our internal proxy endpoint so cover art always renders regardless of ISP blocks
  const image = coverFileName 
    ? `/komik/cover/${m.id}/${coverFileName}` 
    : '/assets/images/no-img.jpg';

  const authorRel = rels.find(r => r.type === 'author');
  const artistRel = rels.find(r => r.type === 'artist');
  const author = authorRel?.attributes?.name || 'Manga Artist';
  const artist = artistRel?.attributes?.name || author;

  const genres = (attrs.tags || [])
    .filter(t => t.attributes?.group === 'genre' || t.attributes?.group === 'theme')
    .map(t => t.attributes?.name?.en)
    .filter(Boolean);

  let type = 'MANGA';
  if (attrs.originalLanguage === 'ko') type = 'MANHWA';
  else if (attrs.originalLanguage === 'zh') type = 'MANHUA';

  const descObj = attrs.description || {};
  const synopsis = descObj.id || descObj.en || Object.values(descObj)[0] || 'Baca komik seru ini secara gratis di Sourcream.';

  return {
    id: m.id,
    slug: m.id,
    title,
    image,
    coverFileName,
    type,
    genre: genres.slice(0, 3).join(', '),
    genres,
    status: attrs.status ? (attrs.status.charAt(0).toUpperCase() + attrs.status.slice(1)) : 'Ongoing',
    synopsis: synopsis.replace(/\r?\n/g, ' ').slice(0, 200) + '...',
    fullSynopsis: synopsis,
    author,
    artist,
    story: artist,
    year: attrs.year || '-',
    firstChapter: 'Ch. 1',
    latestChapter: attrs.lastChapter ? `Ch. ${attrs.lastChapter}` : 'Ongoing'
  };
}

/**
 * Get list of manga with flexible filters
 */
async function getMangaList({ order = 'date', limit = 24, page = 1, title = '', letter = '', type = '', originalLanguage = '' } = {}) {
  try {
    const sourcePath = order === 'peringkat'
      ? '/ranking'
      : (type === 'manhwa' || type === 'manhua' ? `/manga?type=${type}` : '/');
    const $ = await fetchKomikcast(sourcePath);
    const seen = new Set();
    const mangaList = [];
    $('a[href^="/manga/"]').each((index, element) => {
      const href = $(element).attr('href') || '';
      const parts = href.split('/').filter(Boolean);
      if (parts.length !== 2 || seen.has(parts[1])) return;
      const slug = parts[1];
      const card = $(element);
      const cardText = card.text().replace(/\s+/g, ' ').trim();
      const image = normalizeKomikcastImage(card.find('img').attr('src') || card.find('img').attr('data-src') || '/assets/images/no-img.jpg');
      const cardTitle = card.find('h2,h3,h4').first().text().trim() || card.attr('title') || cardText || slug.replace(/-/g, ' ');
      seen.add(slug);
      mangaList.push({
        id: slug,
        slug,
        title: cardTitle,
        image,
        type: type === 'manhwa' ? 'MANHWA' : type === 'manhua' ? 'MANHUA' : 'MANGA',
        genre: 'Komik Indonesia',
        genres: ['Komik Indonesia'],
        status: 'Ongoing',
        synopsis: 'Baca komik Indonesia di Komikcast.',
        latestChapter: 'Terbaru'
      });
    });

    if (mangaList.length > 0) {
      const filtered = title || letter
        ? mangaList.filter(item => item.title.toLowerCase().includes((title || letter).toLowerCase()))
        : mangaList;
      const categoryOffset = order === 'baru' ? 20 : order === 'populer' ? 40 : 0;
      const start = Math.max(0, (page - 1) * limit + categoryOffset);
      return { success: true, data: filtered.slice(start, start + limit), total: filtered.length, page };
    }

    // Keep the legacy request as an emergency fallback if Komikcast is unavailable.
    const offset = Math.max(0, (page - 1) * limit);
    const params = new URLSearchParams();

    params.append('limit', String(limit));
    params.append('offset', String(offset));
    params.append('includes[]', 'cover_art');
    params.append('includes[]', 'author');
    params.append('includes[]', 'artist');
    params.append('contentRating[]', 'safe');
    params.append('contentRating[]', 'suggestive');

    if (type === 'manhwa' || originalLanguage === 'ko') {
      params.append('originalLanguage[]', 'ko');
    } else if (type === 'manhua' || originalLanguage === 'zh') {
      params.append('originalLanguage[]', 'zh');
    } else if (type === 'manga' || originalLanguage === 'ja') {
      params.append('originalLanguage[]', 'ja');
    }

    if (title) {
      params.append('title', title);
    } else if (letter) {
      params.append('title', letter);
    }

    if (order === 'modified' || order === 'populer') {
      params.append('order[followedCount]', 'desc');
    } else if (order === 'meta_value_num' || order === 'peringkat' || order === 'rating') {
      params.append('order[rating]', 'desc');
    } else if (order === 'baru' || order === 'created' || order === 'new') {
      params.append('order[createdAt]', 'desc');
    } else if (order === 'rand' || order === 'acak') {
      params.append('order[relevance]', 'desc');
      // For random, add a random offset if not title
      if (!title && !letter) {
        const randOffset = Math.floor(Math.random() * 50);
        params.set('offset', String(randOffset));
      }
    } else {
      // Default: date / update / rilis chapter terbaru
      params.append('order[latestUploadedChapter]', 'desc');
    }

    const res = await axios.get(`${MD_BASE}/manga?${params.toString()}`, {
      headers: { 'User-Agent': 'Sourcream/1.0' },
      httpsAgent,
      timeout: 15000
    });

    const legacyMangaList = (res.data?.data || []).map(formatManga);
    return {
      success: true,
      data: legacyMangaList,
      total: res.data?.total || 0,
      page
    };
  } catch (error) {
    console.error('MangaDexHelper.getMangaList error:', error.message);
    return { success: false, data: [], total: 0, page };
  }
}

/**
 * Get manga detail by ID
 */
async function getMangaDetail(id) {
  try {
    const mangaSlug = String(id).replace(/^\/+|\/+$/g, '');
    const $ = await fetchKomikcast(`/manga/${mangaSlug}`);
    const title = $('h1').first().text().trim() || mangaSlug.replace(/-/g, ' ');
    const image = normalizeKomikcastImage($('img[src*="thumbnail"], img[alt*="' + title + '"]').first().attr('src') || '/assets/images/no-img.jpg');
    const chapters = parseKomikcastChapterLinks($, mangaSlug)
      .sort((a, b) => getChapterNumber(a) - getChapterNumber(b));
    if (!chapters.length) return null;

    return {
      data: {
        title,
        image,
        status: 'Ongoing',
        type: 'MANGA',
        description: $('meta[name="description"]').attr('content') || 'Baca komik Indonesia di Komikcast.',
        story: '-',
        read: 'Komikcast',
        age: 'Umum',
        author: '-',
        genres: []
      },
      chapters
    };
  } catch (error) {
    console.error(`MangaDexHelper.getMangaDetail (${id}) error:`, error.message);
    return null;
  }
}

/**
 * Get chapters for a manga
 */
async function getMangaChapters(mangaId) {
  try {
    // Fetch every available translation; the UI separates languages into sections.
    const params = new URLSearchParams();
    params.append('limit', '500');
    params.append('order[chapter]', 'desc');
    params.append('order[volume]', 'desc');

    const res = await axios.get(`${MD_BASE}/manga/${mangaId}/feed?${params.toString()}`, {
      headers: { 'User-Agent': 'Sourcream/1.0' },
      httpsAgent,
      timeout: 15000
    });

    const chapterData = res.data?.data || [];

    // Filter out duplicate chapters and external chapters with 0 pages
    const seen = new Set();
    const chapters = [];

    chapterData.forEach(c => {
      const attrs = c.attributes || {};
      const chNum = attrs.chapter || '0';
      const lang = attrs.translatedLanguage || '';
      const key = `${chNum}_${lang}`;

      if (!seen.has(key)) {
        seen.add(key);
        const titleText = attrs.title ? `: ${attrs.title}` : '';
        const languageNames = {
          id: 'Indonesia',
          en: 'English',
          ja: '日本語',
          ko: '한국어',
          zh: '中文',
          es: 'Español',
          fr: 'Français',
          pt: 'Português',
          de: 'Deutsch',
          it: 'Italiano',
          ru: 'Русский',
          tr: 'Türkçe',
          vi: 'Tiếng Việt'
        };
        const language = languageNames[lang] || (lang ? lang.toUpperCase() : 'Unknown');
        const langBadge = lang === 'id' ? '🇮🇩 ' : (lang === 'en' ? '🇬🇧 ' : `[${lang.toUpperCase()}] `);

        chapters.push({
          slug: c.id,
          chapter: chNum,
          title: `${langBadge}Chapter ${chNum}${titleText}`,
          date: attrs.publishAt ? new Date(attrs.publishAt).toLocaleDateString('id-ID') : 'Terbaru',
          pages: attrs.pages || 0,
          language: lang,
          languageName: language,
          complete: Boolean(attrs.pages) && !attrs.externalUrl,
          externalUrl: attrs.externalUrl || null
        });
      }
    });

    return chapters;
  } catch (error) {
    console.error(`MangaDexHelper.getMangaChapters (${mangaId}) error:`, error.message);
    return [];
  }
}

/**
 * Get reading pages for a chapter from MangaDex@Home
 */
async function getChapterPages(chapterId) {
  try {
    if (String(chapterId).includes('/')) {
      const chapterPath = chapterId.startsWith('manga/') ? `/${chapterId}` : `/manga/${chapterId}`;
      const $ = await fetchKomikcast(chapterPath);
      const pages = [];
      $('img[src*="img.komiku.org"], img[data-src*="img.komiku.org"]').each((index, element) => {
        const img = $(element).attr('data-src') || $(element).attr('src');
        if (img && !pages.some(page => page.img === img)) pages.push({ img, alt: `Halaman ${index + 1}` });
      });
      return { pages, baseUrl: '', hash: '', total: pages.length };
    }

    const atHomeRes = await axios.get(`${MD_BASE}/at-home/server/${chapterId}`, {
      headers: { 'User-Agent': 'Sourcream/1.0' },
      httpsAgent,
      timeout: 15000
    });

    const data = atHomeRes.data;
    if (!data || !data.chapter) {
      return { pages: [], baseUrl: '', hash: '' };
    }

    const baseUrl = data.baseUrl;
    const hash = data.chapter.hash;
    const files = data.chapter.data || [];

    // Direct MangaDex@Home URLs
    const pages = files.map((file, idx) => ({
      img: `${baseUrl}/data/${hash}/${file}`,
      alt: `Halaman ${idx + 1}`
    }));

    return {
      pages,
      baseUrl,
      hash,
      total: pages.length
    };
  } catch (error) {
    console.error(`MangaDexHelper.getChapterPages (${chapterId}) error:`, error.message);
    return { pages: [], baseUrl: '', hash: '', total: 0 };
  }
}

/**
 * Get chapter info (for navigation: comicSlug, comicTitle, prev, next)
 */
async function getChapterInfo(chapterId) {
  try {
    if (String(chapterId).includes('/')) {
      const mangaId = String(chapterId).split('/')[0];
      const $ = await fetchKomikcast(`/manga/${mangaId}`);
      const comicTitle = $('h1').first().text().trim() || mangaId.replace(/-/g, ' ');
      const chapterList = parseKomikcastChapterLinks($, mangaId).sort((a, b) => getChapterNumber(a) - getChapterNumber(b));
      const currentIdx = chapterList.findIndex(chapter => chapter.slug === chapterId);
      const current = chapterList[currentIdx];
      const { pages } = await getChapterPages(chapterId);

      return {
        title: `${comicTitle} - Chapter ${current?.chapter || '1'}`,
        comicSlug: mangaId,
        comicTitle,
        prevChapter: currentIdx > 0 ? chapterList[currentIdx - 1].slug : null,
        nextChapter: currentIdx >= 0 && currentIdx < chapterList.length - 1 ? chapterList[currentIdx + 1].slug : null,
        pages,
        chapterList
      };
    }

    const res = await axios.get(`${MD_BASE}/chapter/${chapterId}?includes[]=manga`, {
      headers: { 'User-Agent': 'Sourcream/1.0' },
      httpsAgent,
      timeout: 12000
    });

    const chapter = res.data?.data;
    if (!chapter) return null;

    const mangaRel = (chapter.relationships || []).find(r => r.type === 'manga');
    const mangaId = mangaRel?.id || '';

    // Get chapter pages
    const { pages } = await getChapterPages(chapterId);

    // Get sibling chapters for prev/next navigation
    let prevChapter = null;
    let nextChapter = null;
    let comicTitle = 'Komik';
    let chapterList = [];

    if (mangaId) {
      const mangaInfo = await getMangaDetail(mangaId);
      if (mangaInfo) {
        comicTitle = mangaInfo.data.title;
        chapterList = mangaInfo.chapters || [];

        const currentIdx = chapterList.findIndex(c => c.slug === chapterId);
        if (currentIdx !== -1) {
          // chapterList is ordered desc, so next in reading order is currentIdx - 1 (higher chapter), prev is currentIdx + 1 (lower chapter)
          if (currentIdx > 0) {
            nextChapter = chapterList[currentIdx - 1].slug;
          }
          if (currentIdx < chapterList.length - 1) {
            prevChapter = chapterList[currentIdx + 1].slug;
          }
        }
      }
    }

    const chNum = chapter.attributes?.chapter || '1';
    const chTitle = chapter.attributes?.title ? `: ${chapter.attributes.title}` : '';

    return {
      title: `${comicTitle} - Chapter ${chNum}${chTitle}`,
      comicSlug: mangaId,
      comicTitle,
      prevChapter,
      nextChapter,
      pages,
      chapterList
    };
  } catch (error) {
    console.error(`MangaDexHelper.getChapterInfo (${chapterId}) error:`, error.message);
    return null;
  }
}

module.exports = {
  httpsAgent,
  formatManga,
  getMangaList,
  getMangaDetail,
  getMangaChapters,
  getChapterPages,
  getChapterInfo
};

