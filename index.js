const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const db = require('./models');

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get('/api/games', (req, res) => db.Game.findAll()
  .then((games) => res.send(games))
  .catch((err) => {
    console.log('There was an error querying games', JSON.stringify(err));
    return res.send(err);
  }));

app.post('/api/games', (req, res) => {
  const {
    publisherId,
    name,
    platform,
    storeId,
    bundleId,
    appVersion,
    isPublished,
  } = req.body;
  return db.Game.create({
    publisherId,
    name,
    platform,
    storeId,
    bundleId,
    appVersion,
    isPublished,
  })
    .then((game) => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id).then((game) => {
    const {
      publisherId,
      name,
      platform,
      storeId,
      bundleId,
      appVersion,
      isPublished,
    } = req.body;
    return game
      .update({
        publisherId,
        name,
        platform,
        storeId,
        bundleId,
        appVersion,
        isPublished,
      })
      .then(() => res.send(game))
      .catch((err) => {
        console.log('***Error updating game', JSON.stringify(err));
        res.status(400).send(err);
      });
  });
});

app.post('/api/games/search', (req, res) => {
  const { name, platform } = req.body;

  const whereConditions = {};

  if (name) {
    whereConditions.name = { [db.Sequelize.Op.like]: `%${name}%` };
  }

  if (platform) {
    whereConditions.platform = platform;
  }
  db.Game.findAll({ where: whereConditions })
    .then((games) => res.send(games))
    .catch((err) => {
      console.log('Error searching games', JSON.stringify(err));
      res.status(500).send(err);
    });
});

app.post('/api/games/populate', async (req, res) => {
  console.log('lets populate');
  const urls = [
    'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json',
    'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json',
  ];

  try {
    const gameData = [];

    const fetchPromises = urls.map(async (url) => {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    });

    const results = await Promise.all(fetchPromises);
    results.forEach((data) => gameData.push(...data.flat()));
    console.log('gameData', gameData[0].os, gameData[0].name);

    await db.Game.bulkCreate(
      gameData.map((game) => ({
        publisherId: game.publisher_id,
        name: game.name,
        platform: game.os,
        storeId: game.app_id,
        bundleId: game.bundle_id,
        appVersion: game.version,
        isPublished: !!game.release_date,
      })),
    );

    res.send({ message: 'Database populated successfully' });
  } catch (err) {
    console.log('***Error populating database', JSON.stringify(err));
    res.status(500).send(err);
  }
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
