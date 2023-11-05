Name: Justine Yap
Student Number: 101180098

Installation & Usage
    Prerequisites: Node.js, npm, and MongoDB installed
    Installation:  run `npm install` in your terminal to install the required dependencies.
    Database Setup: Make sure the MongoDB server is running
    Start the server: Run 'npm run start' to start the server
    Access the Application: Open a browser and navigate to http://localhost:3000.

Summary
1. Web Crawler  [finished]
    a. Sites to Crawl: 
        - Fruit example site: 1,000 pages 
                https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html
        - Book example site: 1,000 pages
                https://books.toscrape.com/catalogue/shakespeares-sonnets_989/index.html
    b. Data Storage:
        - Save the crawled data in a database for persistence
                mongodb://127.0.0.1:27017/a1
    c. PageRank:
        - Implement the PageRank algorithm to calculate the rank of each page.
        - Store the PageRank values in the database. 
2. RESTful Web Server [finished]
    a. Data Retrieval:
        Read data from the database.
        Perform indexing on the data.
    b. Endpoints:
        /fruits: Searches data from the fruit example. 
        /personal: Searches data from the alternate site you chose.
    c. Query Parameters:
        q: Search query string.
        boost: Boolean to determine if PageRank should be used to boost search results.
        limit: The number of search results (1-50, default 10).
3. Browser-based Interface
    Allow users to:
        - Input search text.
        - Decide if they want to boost results using PageRank.
        - Specify the number of results (1-50, default 10).
        - Display the following in search results:
        - URL of the original page.
        - Title of the original page.
        - Computed search score for the page.
        - PageRank of the page.
        - Link to view additional data about the page.
4. JSON Response for Search Request [finished]
        - Provide a JSON string containing an array of search results, each with:
        - Group members' names.
        - URL of the original page.
        - Page's search score.
        - Title of the original page.
        - PageRank within the crawled network.
5. Connect to the Distributed Search Engine
        After your server starts:
            - Send a PUT request to register your search server.
            - The request should have a specific JSON format.
            - Use axios or a similar library for this.

Server Configuration
    The application is configured to run on the specified port (default 3000) and connect to a MongoDB database (mongodb://127.0.0.1:27017/a1)

Crawler
    Fruit Crawler:
        - The algorithm for the Fruit Crawler is located in fruitcrawler.js.
        - The module is imported with require("./public/js/fruitcrawler") in server.js.
        - To crawl data, uncomment the line await fruitcrawler.queue("https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html"); in server.js.
        - Run the server by entering npm run start in your terminal.
        - Once the data is crawled and saved to the database, stop the server and comment out the queue line.
        - Restart the server by entering npm run start in your terminal to begin queries.
    Book Crawler:
        - The algorithm for the Book Crawler is located in bookcrawler.js.
        - The module is imported with require("./public/js/bookcrawler") in server.js.
        - To crawl data, uncomment the line await bookcrawler.queue('https://books.toscrape.com/catalogue/shakespeares-sonnets_989/index.html'); in server.js.
        - Run the server by entering npm run start in your terminal.
        - Once the data is crawled and saved to the database, stop the server and comment out the queue line.
        - Restart the server by entering npm run start in your terminal to begin queries.     
End Point Routes
    Home Page
        - Endpoint: /
        - Description: Renders the home page of the web application.
    Fruits Search
        - Endpoint: /fruits
        - Description: Performs a search operation on a collection of fruits. Users can specify a query term, limit, and enable or disable boosting of search results based on page rank.
    Individual Fruit Page
        - Endpoint: /fruits/:title
        - Description: Displays detailed information about an individual fruit based on the provided title.
    Personal Books Search
        - Endpoint: /personal
        - Description: Performs a search operation on a collection of personal books. Users can specify a query term, limit, and enable or disable boosting of search results based on page rank.
    Individual Book Page
        - Endpoint: /personal/:booktitle
        - Description: Displays detailed information about an individual book based on the provided title.

Note to TA:
- I changed the algorithm of requirement "If a valid limit parameter X is specified, your server MUST return X results, even if all documents have a score of 0 (return any X documents in this case). " after video has been uploaded
- difference:
    before: used to just get any fruit pages with keywords "<p>" and book with keyword "..more"
    after: returned x random pages from db and formatted it with 0 score and boost value

Video Demonstration
https://mediaspace.carleton.ca/media/comp4601a1+Justine+Yap+101180098/1_c2rbq1vr