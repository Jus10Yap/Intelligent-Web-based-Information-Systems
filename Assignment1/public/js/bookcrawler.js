//modules
const Crawler = require("crawler");
const url = require("url");
const Book = require("../../models/bookModel");
const { Matrix } = require("ml-matrix");

//Set to keep track of visited URLs.
const visitedURLs = new Set();
//counter to keep track of pages crawled
let pageCount = 0;
const MAX_PAGES = 1000;


//CRAWLER
const p = new Crawler({
    maxConnections: 10,
    callback: async function (error, res, done) {
        if (error) {
            console.log(error);
        } else {
            const currentURL = res.options.uri;
            //if current url has not been visited and we are still below 1000 pages crawled
            if (!visitedURLs.has(currentURL) && pageCount < MAX_PAGES) {
                visitedURLs.add(currentURL);
                const $ = res.$;

                const bookTitle = $("h1").text();
                const bookDescription = $('meta[name="description"]').attr('content') || "";

                const relativeLinks = new Set(); // Use a Set to store unique links

                $("a[href]").each(function () {
                    const link = url.resolve(res.options.uri, $(this).attr('href'));
                    relativeLinks.add(link);
                });

                const uniqueLinks = Array.from(relativeLinks); // Convert Set to an array

                const book = new Book({
                    url: currentURL,
                    title: bookTitle,
                    description: bookDescription,
                    outgoingLinks: uniqueLinks,
                });
                //save book onto db
                await book.save();
                //increase pages crawled counter
                pageCount++;

                //making sure we do not crawl for more than 1000 pages and are queueing unique links only
                uniqueLinks.forEach(link => {
                    if (!visitedURLs.has(link) && pageCount < MAX_PAGES) {
                        p.queue(link);
                    }
                });
            } else {
                console.log(`Skipping already visited URL: ${currentURL}`);
            }
        }
        done();
    },
});

//PAGERANK
async function pageRank() {
    const alpha = 0.1; // Damping factor
    const threshold = 0.0001; // Convergence threshold

    //get all books from the database
    let books = await Book.find();

    const N = books.length; //1000

    //initialize a square matrix filled with zeroes
    let M = Array(N)
        .fill()
        .map(() => Array(N).fill(0));

    //populate transition matrix using outgoing links of each page/url
    books.forEach((book, i) => {
        if (book.outgoingLinks.length) {
            book.outgoingLinks.forEach((outLink) => {
                const j = books.findIndex((b) => b.url === outLink);
                if (j !== -1) {
                    //set the probability for the link from page i to page j
                    M[j][i] = 1 / book.outgoingLinks.length;
                }
            });
        } else {
            //if a page/url does not have an outgoing link
            for (let j = 0; j < N; j++) {
                M[j][i] = 1 / N;
            }
        }
    });

    //initialize the PageRank vector
    let x0 = Array(N).fill(1 / N);
    let diff = 1;

    //compute the PageRank vector until convergence
    while (diff > threshold) {
        const prevMatrix = new Matrix([x0]);

        //compute the next PageRank vector using the transition matrix
        x0 = M.map((row) => row.reduce((i, val, index) => i + val * x0[index], 0))
             .map((val) => (1 - alpha) * val + alpha / N); 

        const x0Matrix = new Matrix([x0]);

        //compute the difference between the current and previous PageRank vector
        const diffMatrix = x0Matrix.sub(prevMatrix);

        //calculate the L2 norm
        diff = diffMatrix.norm();
    }

    const urls = x0.map((value, index) => ({
        url: books[index].url,
        rank: value,
    }));

    //sorting by page rank
    const sortedUrls = urls.sort((a, b) => b.rank - a.rank);
    
    //adding page rank values onto db
    for (const { url, rank } of sortedUrls) {
        await Book.updateOne({ url }, { pageRank: rank });
    }

    loggedUrls = sortedUrls.slice(0, 10); // Displaying top 10

    console.log("Top 10 PageRank Values:");
    loggedUrls.forEach((entry, index) => {
        console.log(`#${index + 1}. (${entry.rank.toFixed(10)}) ${entry.url}`);
    });
}




//Triggered when the queue becomes empty
p.on("drain", async function () {
    console.log("Book Crawling completed.");
    try {
  
    //compute and save the PageRank values onto db
    await pageRank();
  
    } catch (error) {
      console.log("Error post-processing the crawled data:", error);
    }
    
    console.log("Done.");
  });
  
module.exports = p; //exports the crawler