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
  
    traversePaths(starter, startNode, visited = new Set(), currentPath = [], allPaths = [], targetLength = 3) {
      visited.add(startNode);
  
      const neighbors = this.graph.get(startNode);
  
    
  
      if (currentPath.length === 4) {
        
        allPaths.push([...currentPath, startNode]);
        return allPaths;
      }
  
      if (neighbors && neighbors.length > 0) {
        for (const nextNode of neighbors) {
          if (!visited.has(nextNode)) {
            const newPath = [...currentPath, `${startNode}`];
            this.traversePaths(starter, nextNode, new Set(visited), newPath, allPaths, targetLength);
          }
        }
      }
  
      
        allPaths.push([...currentPath, startNode]);
      
  
      return allPaths;
    }
  }

function generateRecommendations(filename) {
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
  const allPaths = graph.traversePaths(users[users.indexOf("User1")],users[users.indexOf("User1")], new Set(), [], [], 3);

  // Filter out paths that don't meet the criteria
  const filteredPaths = allPaths.filter((path) => {
    const lastNode = path[path.length - 1];
    
    return (
        path.length === 4 &&
      !lastNode.startsWith("User") &&
      !graph.graph.get(lastNode).includes(users[users.indexOf("User1")])
    );
  });

  // Extract last items from filtered paths and count occurrences
  const lastItemsCount = filteredPaths.reduce((countMap, path) => {
    const lastItem = path[path.length - 1];
    countMap.set(lastItem, (countMap.get(lastItem) || 0) + 1);
    return countMap;
  }, new Map());

  return lastItemsCount;
}

function generateRecommendationsForFiles(fileNames) {
    const allRecommendations = [];
  
    fileNames.forEach((fileName) => {
      const recommendations = generateRecommendations(fileName);
      allRecommendations.push({ fileName, recommendations });
    });
  
    return allRecommendations;
  }
  
  // Example usage for multiple files
  const filesToProcess = ["./testFiles/test.txt", "./testFiles/test2.txt", "./testFiles/test3.txt", "./testFiles/test4.txt", "./testFiles/test5.txt"];
  const allRecommendations = generateRecommendationsForFiles(filesToProcess);
  
  // Access recommendations for each file
  allRecommendations.forEach(({ fileName, recommendations }) => {
    console.log(`Recommendations for ${fileName}:`);
    if (recommendations.size === 0) {
      console.log("No recommendations found.");
    } else {
      recommendations.forEach((count, item) => {
        console.log(`${item} (${count})`);
      });
    }
  });
