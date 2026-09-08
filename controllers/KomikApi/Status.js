const { setCache } = require('../../middlewares/CacheAPI');

exports.index = async (req, res) => {
  try {
    const data = [
      { slug: "", title: "Semua Status" },
      { slug: "ongoing", title: "Ongoing" },
      { slug: "completed", title: "Completed" }
    ];

    const responseData = { success: true, data };
    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load status.' });
  }
};
