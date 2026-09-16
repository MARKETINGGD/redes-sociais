require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/content', require('./routes/content'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/public', require('./routes/public'));
app.use('/api/public-visits', require('./routes/publicVisits'));

app.use(express.static(path.join(__dirname, 'public')));

// Link público direto (somente leitura)
app.get('/public', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'public.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
