const fs = require("fs");

class Graph {
  constructor() {
    this.graph = new Map();
  }

  addUser(user) {
    this.graph.set(user, []);
  }

  addItem(item) {
    this.graph.set(item, []);
  }

  addEdge(user, item) {
    this.graph.get(user).push(item);
    this.graph.get(item).push(user);
  }

  traversePaths(startNode, visited = new Set(), currentPath = [], allPaths = []) {
    visited.add(startNode);

    const neighbors = this.graph.get(startNode);

if (neighbors && neighbors.length > 0) {
    console.log(`Neighbors of ${startNode}:`, neighbors);
    for (const nextNode of neighbors) {
        if (!visited.has(nextNode)) {
            const newPath = [...currentPath, `${startNode}`];
            // console.log(`Traversing from ${startNode} to ${nextNode}`);
            this.traversePaths(nextNode, new Set(visited), newPath, allPaths);
        }
    }
}

// Always add the current path to all paths
allPaths.push([...currentPath, startNode]);

    return allPaths;
  }

  
}

const filename = "./testFiles/test2.txt";
const data = fs.readFileSync(filename, "utf8").split("\n");
const [numUsers, numItems] = data[0].split(" ").map(Number);
const users = data[1].split(" ");
const items = data[2].split(" ");

const graph = new Graph();

users.forEach((user) => graph.addUser(user));
items.forEach((item) => graph.addItem(item));

for (let i = 3; i < data.length; i++) {
    const ratings = data[i].split(" ").map(Number);
    for (let j = 0; j < ratings.length; j++) {
    if (ratings[j] === 1) {
        graph.addEdge(users[i - 3], items[j]);
    }
    }
}

// Perform traversal starting from User1
const allPaths = graph.traversePaths(users[0]);

// Output all paths
console.log('Traversal Paths:');
if (allPaths.length === 0) {
  console.log('No paths found.');
} else {
  allPaths.forEach((path, index) => {
    console.log(`Path ${index + 1}:`, path.join(' '));
  });
}
