const axios = require('axios');
const https = require('https');
const dns = require('dns');

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

    const mangaList = (res.data?.data || []).map(formatManga);
    return {
      success: true,
      data: mangaList,
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
    const res = await axios.get(`${MD_BASE}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`, {
      headers: { 'User-Agent': 'Sourcream/1.0' },
      httpsAgent,
      timeout: 15000
    });

    if (!res.data?.data) return null;
    const formatted = formatManga(res.data.data);

    // Fetch chapters for this manga (translated in Indonesian or English, and others)
    const chapters = await getMangaChapters(id);

    return {
      data: {
        title: formatted.title,
        image: formatted.image,
        status: formatted.status,
        type: formatted.type,
        description: formatted.fullSynopsis,
        story: formatted.artist,
        read: 'MangaDex',
        age: formatted.year ? `Rilis: ${formatted.year}` : 'Umum',
        author: formatted.author,
        genres: formatted.genres
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
    // We order by chapter desc, volume desc
    const params = new URLSearchParams();
    params.append('limit', '100');
    params.append('order[chapter]', 'desc');
    params.append('order[volume]', 'desc');
    // Prefer Indonesian & English translations first
    params.append('translatedLanguage[]', 'id');
    params.append('translatedLanguage[]', 'en');

    const res = await axios.get(`${MD_BASE}/manga/${mangaId}/feed?${params.toString()}`, {
      headers: { 'User-Agent': 'Sourcream/1.0' },
      httpsAgent,
      timeout: 15000
    });

    let chapterData = res.data?.data || [];

    // If no Indonesian or English chapters, fetch all languages
    if (chapterData.length === 0) {
      const fallbackRes = await axios.get(`${MD_BASE}/manga/${mangaId}/feed?limit=100&order[chapter]=desc`, {
        headers: { 'User-Agent': 'Sourcream/1.0' },
        httpsAgent,
        timeout: 15000
      });
      chapterData = fallbackRes.data?.data || [];
    }

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
        const langBadge = lang === 'id' ? '🇮🇩 ' : (lang === 'en' ? '🇬🇧 ' : `[${lang.toUpperCase()}] `);

        chapters.push({
          slug: c.id,
          chapter: chNum,
          title: `${langBadge}Chapter ${chNum}${titleText}`,
          date: attrs.publishAt ? new Date(attrs.publishAt).toLocaleDateString('id-ID') : 'Terbaru',
          pages: attrs.pages || 0,
          language: lang,
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

