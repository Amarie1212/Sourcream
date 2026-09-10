const { getSupabase, getUserFromRequest } = require('../helpers/SupabaseHelper');

function renderAuth(res, mode, error = null) {
  res.render('auth', {
    site_title: mode === 'login' ? 'Login | Sourcream' : 'Daftar | Sourcream',
    site_desc: 'Kelola akun dan watchlist anime Sourcream.',
    site_keyword: 'login, register, watchlist anime',
    site_url: res.req.domain,
    mode,
    error
  });
}

exports.loginPage = (req, res) => renderAuth(res, 'login');
exports.registerPage = (req, res) => renderAuth(res, 'register');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return renderAuth(res, 'login', error.message);
    res.cookie('sb_access_token', data.session.access_token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: data.session.expires_in * 1000 });
    res.redirect('/');
  } catch (error) {
    console.error('Supabase login error:', error.message);
    renderAuth(res, 'login', process.env.NODE_ENV === 'development' ? error.message : 'Supabase sedang tidak tersedia.');
  }
};

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || username.length < 3 || !email || !password || password.length < 6) return renderAuth(res, 'register', 'Username minimal 3 karakter, email wajib diisi, dan password minimal 6 karakter.');
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } }
    });
    if (error) return renderAuth(res, 'register', error.message);
    if (data.session) {
      res.cookie('sb_access_token', data.session.access_token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: data.session.expires_in * 1000 });
      return res.redirect('/');
    }
    renderAuth(res, 'login', 'Akun berhasil dibuat. Cek email untuk verifikasi, lalu login.');
  } catch (error) {
    console.error('Supabase register error:', error.message);
    renderAuth(res, 'register', process.env.NODE_ENV === 'development' ? error.message : 'Supabase sedang tidak tersedia.');
  }
};

exports.logout = (req, res) => {
  res.clearCookie('sb_access_token');
  res.redirect('/');
};

exports.attachUser = async (req, res, next) => {
  try {
    res.locals.currentUser = await getUserFromRequest(req);
  } catch (error) {
    res.locals.currentUser = null;
  }
  next();
};
