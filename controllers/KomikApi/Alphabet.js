const { setCache } = require('../../middlewares/CacheAPI');
const { getMangaList } = require('../../helpers/MangaDexHelper');

exports.index = async (req, res) => {
  const { show = 'A', page = 1 } = req.query;
  const pageNum = parseInt(page) || 1;

  try {
    const result = await getMangaList({
      letter: show,
      page: pageNum,
      limit: 24
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
    console.error('Komik Alphabet API Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load data.' });
  }
};
