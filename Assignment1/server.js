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

// the URL of the server to register your search engine
const registerUrl = 'http://134.117.130.17:3000/searchengines';

//request payload
const requestData = {
  request_url: "http://134.117.130.183:3000",
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
    // retrieve all fruits from the database
    const fruits = await Fruit.find();

    // add each fruit to the index
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

// index for books
const bookIndex = elasticlunr(function () {
  this.addField("title");
  this.addField("description");
  this.setRef("id");
});

// populates book index
async function populateBookIndex() {
  try {
    // retrieve all books from the database
    const books = await Book.find();

    // add each book to the book index
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
// GET Homepage
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

    // check if the book index is empty
    if (fruitIndex.isEmpty) {
      return res.status(404).json({ error: "Fruit index is empty" });
    }

    // search the index
    let results = fruitIndex.search(query, { expand: true });

    // If there are no search results and the limit is greater than 0, search for pages with a score close to 0
    if (results.length === 0 && limit > 0) {

      // Retrieve the first `limit` fruits from the database
      const fruits = await Fruit.find().limit(limit);

      if (fruits.length === 0) {
        return res.status(404).json({ error: "No fruits found in the database" });
      }

      // Prepare the search results based on the retrieved fruits
      for (const fruit of fruits) {
        let title = fruit.url.split("/").pop().replace(".html", "");
        webpageResults.push({
          name: "Justine Yap",
          url: fruit.url,
          score: 0, // Score can be set to 0 for these results
          title: title,
          pr: fruit.pageRank,
        });
      }
    } else {
      // calculate and add boost values to the results
      if (boost) {
        for (const result of results) {
          const fruit = await Fruit.findById(result.ref);
          if (fruit) {
            const pageRankBoost = fruit.pageRank * result.score;
            result.boost = pageRankBoost; // Add the boost value to the result
          }
        }
        // sort the results by boost
        results.sort((a, b) => {
          return b.boost - a.boost;
        });
      } else {
        // sort the results by score
        results.sort((a, b) => {
          return b.score - a.score;
        });
      }

      // fetch the fruits based on the search results
      for (const result of results.slice(0, limit)) {
        const fruit = await Fruit.findById(result.ref);
        if (fruit) {
          let title = fruit.url.split("/").pop().replace(".html", "");
          webpageResults.push({
            name: "Justine Yap",
            url: fruit.url,
            score: result.score,
            title: title,
            pr: fruit.pageRank,
            boost: result.boost,
          });
        }
      }
    }



    res.format({
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json(webpageResults); // Send JSON response
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

//GET fruit
app.get("/fruits/:title", async (req, res) => {
  try {
    const partialUrl = req.params.title.slice(1);
    const fullUrl = `https://people.scs.carleton.ca/~davidmckenney/fruitgraph/${partialUrl}.html`;

    // find the fruit in the database based on the full URL
    const fruit = await Fruit.findOne({ url: fullUrl });

    if (!fruit) {
      return res.status(404).send("Fruit not found");
    }

    // find incoming links to the requested page
    const incomingLinks = await Fruit.find({ outgoingLinks: fullUrl }, "url");

    // use Cheerio to parse the HTML content and extract text
    const $ = cheerio.load(fruit.content);
    const textContent = $("body").text(); // Extract text content from the <body> element

    // split the text content into words and count word frequency
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
          wordFrequency: wordFrequency
        });
      },
      "text/html": () => {
        res.set("Content-Type", "text/html");
        res.render("fruit", {
          url: fruit.url,
          title: title,
          incomingLinks: incomingLinks.map((link) => link.url),
          outgoingLinks: fruit.outgoingLinks,
          wordFrequency: wordFrequency
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
    const boost = req.query.boost === "true"; // check if boost is true
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

    // check if the book index is empty
    if (bookIndex.isEmpty) {
      return res.status(404).json({ error: "Book index is empty" });
    }

    // search the book index
    let results = bookIndex.search(query, { expand: true });

    // If there are no search results and the limit is greater than 0, search for pages with a score close to 0
    if (results.length === 0 && limit > 0) {
      // Retrieve the first `limit` books from the database
      const books = await Book.find().limit(limit);

      if (books.length === 0) {
        return res.status(404).json({ error: "No books found in the database" });
      }

      // Prepare the search results based on the retrieved fruits
      for (const book of books) {
        bookResults.push({
          name: "Justine Yap",
          url: book.url,
          score: 0,
          title: book.title,
          pr: book.pageRank,
        });
      }
    } else {

      // calculate and add boost values to the results
      if (boost) {
        for (const result of results) {
          const book = await Book.findById(result.ref);
          if (book) {
            const pageRankBoost = book.pageRank * result.score;
            result.boost = pageRankBoost; // Add the boost value to the result
          }
        }

        // sort the results by boost
        results.sort((a, b) => {
          return b.boost - a.boost;
        });
      } else {
        // sort the results by score
        results.sort((a, b) => {
          return b.score - a.score;
        });
      }

      // fetch the books based on the search results
      for (const result of results.slice(0, limit)) {
        const book = await Book.findById(result.ref);
        if (book) {
          bookResults.push({
            name: "Justine Yap",
            url: book.url,
            title: book.title,
            score: result.score,
            pr: book.pageRank,
            boost: result.boost,
          });
        }
      }
    }
    res.format({
      "application/json": () => {
        res.set("Content-Type", "application/json");
        res.json(bookResults); // Send JSON response
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

// GET book
app.get("/personal/:booktitle", async (req, res) => {
  try {
    const bookTitle = req.params.booktitle.slice(1);

    // find the book in the database based on the title
    const book = await Book.findOne({ title: bookTitle });

    if (!book) {
      return res.status(404).send("Book not found");
    }

    // find outgoing links from the requested book
    const outgoingLinks = book.outgoingLinks;

    // use Cheerio to parse the HTML content and extract text
    const $ = cheerio.load(book.description);
    const textContent = $("body").text();

    // split the text content into words and count word frequency
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
//start the connection to the database
mongoose.connect("mongodb://127.0.0.1:27017/a1", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//get the default Mongoose connection (can then be shared across multiple files)
let db = mongoose.connection;

db.on("error", console.log.bind(console, "connection error:"));
db.once("open", function () {
  // confirmation of successful connection to the database.
  console.log("Connected to productsDB database.");
  // starting the Express server.
  app.listen(PORT, async () => {
    console.log(`Server is running on "http://134.117.130.183:${PORT}"`);

    //Run the Fruit Crawler
    //await fruitcrawler.queue("https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html");

    //Run the Book Crawler
    //await bookcrawler.queue('https://books.toscrape.com/catalogue/shakespeares-sonnets_989/index.html');

    //Populate the Fruit Index
    await populateFruitIndex();

    //Populate the Book Index
    await populateBookIndex();


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
        if (error.response) {
          // The request was made and the server responded with a status code
          console.log(`Server registration failed. Status code: ${error.response.status}`);
          console.log('Response data:', error.response.data);
        }
      });
  });

});