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
const cheerio = require("cheerio");
const axios = require('axios');

//crawler files
const fruitcrawler = require("./public/js/fruitcrawler");
const bookcrawler = require("./public/js/bookcrawler");

//models
const Fruit = require("./models/fruitModel");
const Book = require("./models/bookModel");

//setting middleware
app.set("views");
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join("public", "javascript")));
app.use(express.static(path.join("public", "images")));
app.use(express.static(path.join("public", "css")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// The URL of the server where you want to register your search engine
const registerUrl = 'http://134.117.130.17:3000/searchengines';

//server's base URL
const yourServerUrl = 'URL_for_your_server';

// Define the request payload
const requestData = {
  request_url: yourServerUrl,
};

//log requests received
app.use(function (req, res, next) {
  console.log(`${req.method} for ${req.url}`);
  if (Object.keys(req.body).length > 0) {
    console.log("Body:");
    console.log(req.body);
  }
  next();
});

//index for fruits
const fruitIndex = elasticlunr(function () {
  this.addField("title");
  this.addField("body");
  this.setRef("id");
});

//populates fruit index
async function populateFruitIndex() {
  try {
    // Retrieve all fruits from the database
    const fruits = await Fruit.find();

    // Add each fruit to the index
    fruits.forEach((fruit) => {
      fruitIndex.addDoc({
        id: fruit._id.toString(), //ObjectID
        title: fruit.title,
        body: fruit.content,
      });
    });

    console.log("Fruit Index populated!");
  } catch (error) {
    console.log("Error populating the fruit index:", error);
  }
}

//index for books
const bookIndex = elasticlunr(function () {
  this.addField("title");
  this.addField("description");
  this.setRef("id");
});

//populates book index
async function populateBookIndex() {
  try {
    // Retrieve all books from the database
    const books = await Book.find();

    // Add each book to the book index
    books.forEach((book) => {
      bookIndex.addDoc({
        id: book._id.toString(), //ObjectID
        title: book.title,
        description: book.description,
      });
    });

    console.log("Book index populated!");
  } catch (error) {
    console.log("Error populating the book index:", error);
  }
}

// Get Handlers
// GET Homepage: Renders the home page.
app.get(["/", "/home"], (req, res) => res.render("home"));

// GET fruits
app.get("/fruits", async (req, res) => {
  try {
    let webpageResults = [];
    const query = req.query.q || "";
    const boost = req.query.boost === "true"; // Check if boost is true
    let limit = parseInt(req.query.limit);

    if (isNaN(limit)) {
      limit = 10; //setting default to 10 if no limit param
    }

    if (limit < 1 || limit > 50) {
      //edge case where `limit` is not within 1-50
      return res
        .status(400)
        .json({ error: "Query parameter 'limit' must be between 1 and 50" });
    }

    // Search the index
    const results = fruitIndex.search(query, { expand: true });

    // Calculate and add boost values to the results
    if (boost) {
      for (const result of results) {
        const fruit = await Fruit.findById(result.ref);
        if (fruit) {
          const pageRankBoost = fruit.pageRank * result.score;
          result.boost = pageRankBoost; // Add the boost value to the result
        }
      }
      // Sort the results by boost
      results.sort((a, b) => {
        return b.boost - a.boost;
      });
    } else {
      // Sort the results by score
      results.sort((a, b) => {
        return b.score - a.score;
      });
    }

    // Fetch the fruits based on the search results
    for (const result of results.slice(0, limit)) {
      const fruit = await Fruit.findById(result.ref);
      if (fruit) {
        let title = fruit.url.split("/").pop().replace(".html", "");
        webpageResults.push({
          name: "Justine Yap",
          id: result.ref,
          url: fruit.url,
          title: title,
          score: result.score,
          pageRank: fruit.pageRank,
          boost: result.boost,
        });
      }
    }

    res.format({
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json({ webpageResults }); // Send JSON response
      },
      "text/html": () => {
        res.set("Content-Type", "text/html");
        res.render("fruits", { webpageResults }); // Render PUG template and send HTML response
      },
      default: () => {
        res.status(406).send("Not acceptable");
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error" }); // Send JSON error response
  }
});

app.get("/fruits/:title", async (req, res) => {
  try {
    const partialUrl = req.params.title.slice(1);
    const fullUrl = `https://people.scs.carleton.ca/~davidmckenney/fruitgraph/${partialUrl}.html`;

    // Find the fruit in the database based on the full URL
    const fruit = await Fruit.findOne({ url: fullUrl });

    if (!fruit) {
      return res.status(404).send("Fruit not found");
    }

    // Find incoming links to the requested page
    const incomingLinks = await Fruit.find({ outgoingLinks: fullUrl }, "url");

    // Use Cheerio to parse the HTML content and extract text
    const $ = cheerio.load(fruit.content);
    const textContent = $("body").text(); // Extract text content from the <body> element

    // Split the text content into words and count word frequency
    const words = textContent.split(/\s+/).filter((word) => word.trim() !== ""); // Split and filter out empty strings (white spaces)
    const wordFrequency = {};
    for (const word of words) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
    let title = fruit.url.split("/").pop().replace(".html", "");

    res.format({
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json({
          name: "Justine Yap",
          url: fruit.url,
          title: title,
          incomingLinks: incomingLinks.map((link) => link.url),
          outgoingLinks: fruit.outgoingLinks,
          wordFrequency: wordFrequency,
        });
      },
      "text/html": () => {
        res.set("Content-Type", "text/html");
        res.render("fruit", {
          url: fruit.url,
          title: title,
          incomingLinks: incomingLinks.map((link) => link.url),
          outgoingLinks: fruit.outgoingLinks,
          wordFrequency: wordFrequency,
        });
      },
      default: () => {
        res.status(406).send("Not acceptable");
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

// GET books
app.get("/personal", async (req, res) => {
  try {
    let bookResults = [];
    const query = req.query.q || "";
    const boost = req.query.boost === "true"; // Check if boost is true
    let limit = parseInt(req.query.limit);

    if (isNaN(limit)) {
      limit = 10;
    }
    if (limit < 1 || limit > 50) {
      //edge case where `limit` is not within 1-50
      return res
        .status(400)
        .json({ error: "Query parameter 'limit' must be between 1 and 50" });
    }

    // Check if the book index is empty
    if (bookIndex.isEmpty) {
      return res.status(404).json({ error: "Book index is empty" });
    }

    // Search the book index
    const results = bookIndex.search(query, { expand: true });

    // Calculate and add boost values to the results
    if (boost) {
      for (const result of results) {
        const book = await Book.findById(result.ref);
        if (book) {
          const pageRankBoost = book.pageRank * result.score;
          result.boost = pageRankBoost; // Add the boost value to the result
        }
      }

      // Sort the results by boost
      results.sort((a, b) => {
        return b.boost - a.boost;
      });
    } else {
      // Sort the results by score
      results.sort((a, b) => {
        return b.score - a.score;
      });
    }

    // Fetch the books based on the search results
    for (const result of results.slice(0, limit)) {
      const book = await Book.findById(result.ref);
      if (book) {
        bookResults.push({
          name: "Justine Yap",
          id: result.ref,
          url: book.url,
          title: book.title,
          description: book.description,
          score: result.score,
          pageRank: book.pageRank,
          boost: result.boost,
        });
      }
    }
    res.format({
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json({ bookResults }); // Send JSON response
      },
      "text/html": () => {
        res.set("Content-Type", "text/html");
        res.render("books", { bookResults }); // Render PUG template and send HTML response
      },
      default: () => {
        res.status(406).send("Not acceptable");
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error" }); // Send JSON error response
  }
});

// Route to handle /personal/:booktitle
app.get("/personal/:booktitle", async (req, res) => {
  try {
    const bookTitle = req.params.booktitle.slice(1);

    // Find the book in the database based on the title
    const book = await Book.findOne({ title: bookTitle });

    if (!book) {
      return res.status(404).send("Book not found");
    }

    // Find outgoing links from the requested book
    const outgoingLinks = book.outgoingLinks;

    // Use Cheerio to parse the HTML content and extract text
    const $ = cheerio.load(book.description);
    const textContent = $("body").text(); // Extract text content from the <body> element

    // Split the text content into words and count word frequency
    const words = textContent.split(/\s+/).filter((word) => word.trim() !== ""); // Split and filter out empty strings (white spaces)
    const wordFrequency = {};
    for (const word of words) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }

    res.format({
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json({
          name: "Justine Yap",
          url: book.url,
          title: book.title,
          description: book.description,
          outgoingLinks: outgoingLinks,
          wordFrequency: wordFrequency,
        });
      },
      "text/html": () => {
        res.set("Content-Type", "text/html");
        res.render("book", {
          url: book.url,
          title: book.title,
          description: book.description,
          outgoingLinks: outgoingLinks,
          wordFrequency: wordFrequency,
        });
      },
      default: () => {
        res.status(406).send("Not acceptable");
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server error");
  }
});

// Send a PUT request to register your server
axios
  .put(registerUrl, requestData, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then((response) => {
    console.log(`Server registration successful. Status code: ${response.status}`);
  })
  .catch((error) => {
    console.log(`Server registration failed:${error}`);
  });

//Start the connection to the database
mongoose.connect("mongodb://127.0.0.1:27017/a1", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//Get the default Mongoose connection (can then be shared across multiple files)
let db = mongoose.connection;

db.on("error", console.log.bind(console, "connection error:"));
db.once("open", function () {
  // Confirmation of successful connection to the database.
  console.log("Connected to productsDB database.");
  // Starting the Express server.
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  //fruitcrawler.queue("https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html");
  //bookcrawler.queue('https://books.toscrape.com/catalogue/shakespeares-sonnets_989/index.html');
  populateFruitIndex();
  populateBookIndex();
});
