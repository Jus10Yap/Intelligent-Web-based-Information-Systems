const fs = require('fs');

function countIncomingLinks(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n').filter(line => line); // Filter out any empty lines
    
    const pageCount = 1000; // Assuming up to 1000 pages
    const incomingLinksCount = Array(pageCount).fill(0); // Initialize counts to 0 for each page

    lines.forEach(line => {
        const columns = line.split(' ').map(Number); // Convert to numbers assuming space-separated values

        columns.forEach((value, index) => {
            if (value === 1) {
                incomingLinksCount[index]++;
            }
        });
    });

    incomingLinksCount.forEach((count, pageIndex) => {
        console.log(`Incoming links for Page ${pageIndex}: ${count}`);
    });
}

countIncomingLinks('matrix.txt');
