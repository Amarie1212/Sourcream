const { setCache } = require('../../middlewares/CacheAPI');

exports.index = async (req, res) => {
  try {
    const data = [
      { slug: "", title: "Semua Tipe" },
      { slug: "manga", title: "Manga (Jepang)" },
      { slug: "manhwa", title: "Manhwa (Korea)" },
      { slug: "manhua", title: "Manhua (China)" }
    ];

    const responseData = { success: true, data };
    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load types.' });
  }
};
