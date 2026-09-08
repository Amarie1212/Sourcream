const { setCache } = require('../../middlewares/CacheAPI');

exports.index = async (req, res) => {
  try {
    const data = [
      { slug: "date", title: "Rilis Terbaru" },
      { slug: "modified", title: "Terpopuler" },
      { slug: "meta_value_num", title: "Top Rating" },
      { slug: "rand", title: "Acak" }
    ];

    const responseData = { success: true, data };
    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load order.' });
  }
};
