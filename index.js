const http = require("http");
const express = require("express");
const app = express();

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.set('port', (process.env.PORT || 5000));


// static files
const fs = require("fs");
const path = require("path");

// auth
const bcrypt = require("bcrypt");
const session = require("express-session");
app.use(session(
	{secret: "very-long-and-reliable-secret-word",
         resave: false,
         saveUninitialized: false
    }));


// db
/*const pg = require("pg");
var client = new pg.Client({
    user: "user",
    password: "secretPassword",
    database: "myDB",
    port: 5432,
    host: "myHost",
    ssl: false
});
db = client.connect();*/

console.log("env: " + process.env);
console.log("database  url: " + process.env.DATABASE_URL);

const { Client } = require('pg');
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

dbClient.connect();
// https://stackoverflow.com/questions/11700602/how-can-i-attach-a-database-to-an-app-in-heroku


/*client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
  client.end();
});*/

// post request
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
  	extended: true
}));

// routing
const modulesDir = "./modules"
require(modulesDir + "/routes")(express, app, path, bcrypt);


// OTHER MODULES

// START THE APP
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
