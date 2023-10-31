Justine Yap
101180098

Installation & Usage
    Prerequisites: Node.js, npm, and MongoDB installed
    Installation:  run `npm install` in your terminal to install the required dependencies.
    Database Setup: Make sure the MongoDB server is running
    Start the server: Run 'npm run start' to start the server
    Access the Application: Open a browser and navigate to http://localhost:3000.

Summary
1. Web Crawler
    a. Sites to Crawl:
        - Fruit example site: 1,000 pages.
        - Another site of your choosing: 500-1,000 pages.
    b. Data Storage:
        - Save the crawled data in a database for persistence.
    c. PageRank:
        - Implement the PageRank algorithm to calculate the rank of each page.
        - Store the PageRank values in the database.
2. RESTful Web Server
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
        Input search text.
        Decide if they want to boost results using PageRank.
        Specify the number of results (1-50, default 10).
        Display the following in search results:

URL of the original page.
Title of the original page.
Computed search score for the page.
PageRank of the page.
Link to view additional data about the page.
4. JSON Response for Search Request
Provide a JSON string containing an array of search results, each with:

Group members' names.
URL of the original page.
Page's search score.
Title of the original page.
PageRank within the crawled network.
5. Connect to the Distributed Search Engine
After your server starts:

Send a PUT request to register your search server.
The request should have a specific JSON format.
Use axios or a similar library for this.



Video Demonstration