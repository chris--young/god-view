'use strict';

const express = require('express');
const app = express();

app.use((req, res, next) => {
  console.log(`${new Date()} ${req.method} ${req.path}`);
  next();
});

app.use(express.static(`${__dirname}/public`));

app.get('/', (req, res) => res.sendFile(`${__dirname}/public/index.html`));

app.listen(8421);
