const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return { polls: [] };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// API: Get all polls
app.get('/api/polls', (req, res) => {
  const db = loadData();
  // Return polls without sensitive PINs
  const publicPolls = db.polls.map(p => ({
    id: p.id,
    title: p.title,
    options: p.options,
    hasPin: !!p.pin,
    createdAt: p.createdAt
  }));
  res.json(publicPolls);
});

// API: Create poll
app.post('/api/polls', (req, res) => {
  const { title, options, pin } = req.body;
  if (!title || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Title and at least 2 options are required.' });
  }

  const db = loadData();
  const newPoll = {
    id: uuidv4(),
    title: title.trim(),
    options: options.map(opt => ({ text: opt.trim(), votes: 0 })),
    pin: pin ? pin.trim() : '',
    createdAt: new Date().toISOString()
  };

  db.polls.unshift(newPoll);
  saveData(db);

  res.status(201).json({
    id: newPoll.id,
    title: newPoll.title,
    options: newPoll.options,
    hasPin: !!newPoll.pin,
    createdAt: newPoll.createdAt
  });
});

// API: Get single poll details (with vote counts)
app.get('/api/polls/:id', (req, res) => {
  const db = loadData();
  const poll = db.polls.find(p => p.id === req.params.id);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found.' });
  }

  res.json({
    id: poll.id,
    title: poll.title,
    options: poll.options,
    hasPin: !!poll.pin,
    createdAt: poll.createdAt
  });
});

// API: Vote on poll
app.post('/api/polls/:id/vote', (req, res) => {
  const { optionIndex } = req.body;
  const db = loadData();
  const poll = db.polls.find(p => p.id === req.params.id);
  
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found.' });
  }

  if (optionIndex === undefined || optionIndex < 0 || optionIndex >= poll.options.length) {
    return res.status(400).json({ error: 'Invalid option index.' });
  }

  poll.options[optionIndex].votes += 1;
  saveData(db);

  res.json({
    id: poll.id,
    title: poll.title,
    options: poll.options,
    hasPin: !!poll.pin
  });
});

// API: Delete poll (requires PIN if set)
app.delete('/api/polls/:id', (req, res) => {
  const { pin } = req.body;
  const db = loadData();
  const pollIndex = db.polls.findIndex(p => p.id === req.params.id);

  if (pollIndex === -1) {
    return res.status(404).json({ error: 'Poll not found.' });
  }

  const poll = db.polls[pollIndex];
  if (poll.pin && poll.pin !== pin) {
    return res.status(403).json({ error: 'Incorrect PIN.' });
  }

  db.polls.splice(pollIndex, 1);
  saveData(db);

  res.json({ success: true });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bình Chọn Nhanh server running on port ${PORT}`);
  });
}

module.exports = app;
