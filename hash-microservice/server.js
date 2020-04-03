var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var pg = require('pg');
const { Pool, Client } = require('pg');
var path = require('path');
var app = express();
var port = process.env.NODE_PORT || 3000;
var config = require('./config/config');
const Sentry = require('@sentry/node');

const pool = new Pool({ connectionString: config.connectionString });
Sentry.init({ dsn: config.sentryDSN });

app.use(Sentry.Handlers.requestHandler());
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.set('view engine', 'html');

const allowCrossDomain = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}

if(process.env.NODE_ENV == 'dev'){
  app.use(allowCrossDomain);
}

app.get('/captures', function (req, res) {
  //console.log(req);

  let bounds = req.query['bounds'];
  let boundingBoxQuery = '';
  if (bounds) {
    boundingBoxQuery = 'AND trees.estimated_geometric_location && ST_MakeEnvelope(' + bounds + ', 4326) ';
    console.log(bounds);
  }

  var sql, query
  const filter = ""

  sql = `SELECT DISTINCT ON(trees.id)
  'point' AS type,
    trees.*, planter.first_name as first_name, planter.last_name as last_name,
    planter.image_url as user_image_url 
  FROM trees
  INNER JOIN planter
  ON planter.id = trees.planter_id
  WHERE active = true ` + boundingBoxQuery + filter ;
  console.log(sql);

  query = {
    text: sql
  };

  console.log(query);
  pool.query(query)
    .then(function (data) {
      console.log('query ok');
      console.log(data.rows)
      res.status(200).json({
        data: data.rows
      })
    })
    .catch(function(error) {
      console.log('query not ok');
      console.log(error);
      throw(error);
    });

});

app.put('/captures/:id/hash', function(req, res) {

  const hash = req.body.hash
  const tree_id = req.params.id

  const query = {
    text: `UPDATE trees
    SET matching_hash = $1
    WHERE id = $2
    RETURNING *`,
    values: [hash, tree_id]
  }

  console.log(query);
  pool.query(query)
    .then(function (data) {
      console.log('query ok');
      console.log(data.rows)
      res.status(200).json({
        data: data.rows[0]
      })
    })
    .catch(function(error) {
      console.log('query not ok');
      console.log(error);
      throw(error);
    });
});

app.use(Sentry.Handlers.errorHandler());

app.listen(port, () => {
  console.log('listening on port ' + port);
});
