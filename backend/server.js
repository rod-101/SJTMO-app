const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded ordinance files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const violationRoutes = require('./routes/violations');
const userRoutes = require('./routes/users');
const ordinanceRoutes = require('./routes/ordinances');

app.use('/login', authRoutes);
app.use('/violations', violationRoutes);
app.use('/users', userRoutes);
app.use('/ordinances', ordinanceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'SJTMO Backend running' });
});

app.listen(PORT, () => {
  console.log(`SJTMO Backend running on http://localhost:${PORT}`);
});
