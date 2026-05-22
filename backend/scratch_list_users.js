const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./src/models/user');
const Analysis = require('./src/models/analysis');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/devtracker');
    const users = await User.find({});
    console.log('--- USERS IN DB ---');
    console.log(users.map(u => ({ id: u._id, username: u.username, email: u.email, hasToken: !!u.githubToken })));
    
    const analyses = await Analysis.find({});
    console.log('--- ANALYSES IN DB ---');
    console.log(analyses.map(a => ({ id: a._id, owner: a.repoOwner, repo: a.repoName, user: a.userId })));
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

run();
