/*
Name: Justine Yap
Std Number: 101180098
*/

//modules
const http = require("http");
const pug = require("pug");
const fs = require("fs");
const url = require("url");
const path = require("path");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const mongoose = require("mongoose");
const Crawler = require("crawler");
const elasticlunr = require("elasticlunr");
const { Matrix } = require("ml-matrix");


const fruitcrawler = require("./public/js/fruitcrawler");
const bookcrawler = require("./public/js/bookcrawler");
//setting middleware
app.set("views");
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join("public", "javascript")));
app.use(express.static(path.join("public", "images")));
app.use(express.static(path.join("public", "css")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//log requests received
app.use(function (req, res, next) {
  console.log(`${req.method} for ${req.url}`);
  if (Object.keys(req.body).length > 0) {
    console.log("Body:");
    console.log(req.body);
  }
  next();
});

// Get Handlers
// GET Homepage: Renders the home page.
app.get(["/", "/home"], (req, res) => res.render("home"));

//Start the connection to the database
mongoose.connect("mongodb://127.0.0.1:27017/a1", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//Get the default Mongoose connection (can then be shared across multiple files)
let db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  // Confirmation of successful connection to the database.
  console.log("Connected to productsDB database.");
  // Starting the Express server.
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  //fruitcrawler.queue("https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html");
  //bookcrawler.queue('https://books.toscrape.com/catalogue/shakespeares-sonnets_989/index.html');
});
