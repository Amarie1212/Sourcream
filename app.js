require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const ApiKeyMiddleware = require('./middlewares/AuthApiKey');
const { setupSocket } = require('./middlewares/Socket');

// Global crash prevention guards
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]:', reason?.message || reason);
});

const app = express();
const server = http.createServer(app);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.domain = req.headers.host;
  next();
});

const Web = require('./routes/Web');
app.use('/', Web);

const Api = require('./routes/Api');
app.use('/v1', ApiKeyMiddleware, Api);

const NotFoundPage = require('./controllers/404Controller');
app.use((req, res, next) => {
    NotFoundPage.index(req, res);
});

// Global Express error handler to prevent crashing on unhandled route errors
app.use((err, req, res, next) => {
    console.error('Unhandled Route Error:', err.message);
    if (!res.headersSent) {
        res.status(500).render('500', {
            site_title: 'Terjadi Kesalahan | Sourcream',
            site_desc: 'Sedang ada kendala, coba sesaat lagi.',
            site_keyword: 'error',
            site_url: req.domain || 'localhost'
        });
    }
});

setupSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
