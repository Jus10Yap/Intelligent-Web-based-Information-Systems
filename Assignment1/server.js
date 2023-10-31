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
const elasticlunr = require("elasticlunr");

const fruitcrawler= require("./public/js/fruitcrawler");
const bookcrawler = require("./public/js/bookcrawler");
const Fruit = require("./models/fruitModel");

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

//Create your index
//Specify fields you want to include in search
//Specify reference you want back (i.e., page ID)
const index = elasticlunr(function () {
  this.addField("title");
  this.addField("body");
  this.setRef("id");
});

async function populateIndex() {
  try {
      // Retrieve all fruits from the database
      const fruits = await Fruit.find();

      // Add each fruit to the index
      fruits.forEach(fruit => {
          index.addDoc({
              id: fruit._id.toString(), // Use the string representation of the ObjectID
              title: fruit.title, // Use the title field if you added it, else skip this.
              body: fruit.content
          });
      });

      console.log("Index populated!");
  } catch (error) {
      console.error("Error populating the index:", error);
  }
}

// Get Handlers
// GET Homepage: Renders the home page.
app.get(["/", "/home"], (req, res) => res.render("home"));

app.get("/fruits", async (req, res) => {
  try {
    
    let webpageResults = [];
    const query = req.query.q || "";
    const boost = req.query.boost === "true"; // Check if boost is true
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50); // Ensure limit is between 1 and 50, default to 10

    // Search the index
    const results = index.search(query, { expand: true });

    // If boost is enabled, boost the results using PageRank
    if (boost) {
      results.sort(async (a, b) => {
        const pageRankA = (await Fruit.findById(a.ref)).pageRank || 0;
        const pageRankB = (await Fruit.findById(b.ref)).pageRank || 0;
        // Consider both PageRank and search score
        return (b.score + pageRankB) - (a.score + pageRankA);
      });
    }

    // Fetch the fruits based on the search results
    for (const result of results.slice(0, limit)) {  // Limit the results
      const fruit = await Fruit.findById(result.ref);
      if (fruit) {
        let title = fruit.url.split("/").pop().replace(".html", "");
        webpageResults.push({
          id: result.ref,
          url: fruit.url,
          title: title,
          score: result.score,
          pageRank: fruit.pageRank  
        });
      }
    }

    res.render("fruits", { webpageResults: webpageResults });

  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});


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
  populateIndex();
});
