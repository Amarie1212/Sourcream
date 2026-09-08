const { setCache } = require('../../middlewares/CacheAPI');

exports.index = async (req, res) => {
  try {
    const data = [
      { slug: "", title: "Semua Genre" },
      { slug: "action", title: "Action" },
      { slug: "adventure", title: "Adventure" },
      { slug: "comedy", title: "Comedy" },
      { slug: "drama", title: "Drama" },
      { slug: "fantasy", title: "Fantasy" },
      { slug: "horror", title: "Horror" },
      { slug: "mystery", title: "Mystery" },
      { slug: "psychological", title: "Psychological" },
      { slug: "romance", title: "Romance" },
      { slug: "sci-fi", title: "Sci-Fi" },
      { slug: "slice-of-life", title: "Slice of Life" },
      { slug: "sports", title: "Sports" },
      { slug: "supernatural", title: "Supernatural" },
      { slug: "thriller", title: "Thriller" },
      { slug: "isekai", title: "Isekai" }
    ];

    const responseData = { success: true, data };
    setCache(res.cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load genres.' });
  }
};
