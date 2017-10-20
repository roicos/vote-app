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

const { Client } = require('pg');
const dbClient = new Client({

  //connectionString: process.env.DATABASE_URL,

  /*user: "mrlvznufwtxadb",
  password: "53508401758b022cfb0417c523d470d26bf2ef46e7ad2f57f072133e136514cd",
  database: "dc5rsgnuighnqr",
  port: 5432,
  host: "ec2-50-17-203-195.compute-1.amazonaws.com",
  ssl: true*/

  user: "postgres",
  password: "postgres",
  database: "voteAppDB",
  port: 5432,
  host: "localhost"
});

dbClient.connect();

// post request
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
  	extended: true
}));

// routing
const modulesDir = "./modules"
require(modulesDir + "/routes")(express, app, path, bcrypt, dbClient);


// OTHER MODULES

// START THE APP
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
