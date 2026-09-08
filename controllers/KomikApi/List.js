const { setCache } = require('../../middlewares/CacheAPI');
const { getMangaList } = require('../../helpers/MangaDexHelper');

exports.index = async (req, res) => {
  const { order = 'date', page = 1, limit = 24, type = '', letter = '', title = '' } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(100, parseInt(limit) || 24);

  try {
    const result = await getMangaList({
      order,
      type,
      letter,
      title,
      page: pageNum,
      limit: limitNum
    });

    const responseData = {
      success: true,
      data: result.data,
      total: result.total,
      page: pageNum
    };

    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('KomikAPI List Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load data.' });
  }
};
