const fs = require("fs");

// Read and parse the input file
const data = fs.readFileSync("./testFiles/test3.txt", "utf8").split("\n");
const [numUsers, numItems] = data[0].split(" ").map(Number);
const users = data[1].split(" ");
const items = data[2].split(" ");

// Parse user ratings and handle -1 values
const userRatings = [];
for (let i = 3; i < 3 + numUsers; i++) {
  const ratings = data[i].split(" ").map(Number);
  userRatings.push(ratings);
}

const neighborhoodSize = 2;

// Initialize user-item matrix
const userItemMatrix = userRatings.map((row) => row.slice());

// function that calculates Pearson correlation between users
function pearsonCorrelation(user1, user2) {
 
  const ra =
    user1.reduce((acc, rating) => (rating !== -1 ? acc + rating : acc), 0) /
    user1.filter((rating) => rating !== -1).length;

  const rb =
    user2.reduce((acc, rating) => (rating !== -1 ? acc + rating : acc), 0) /
    user2.filter((rating) => rating !== -1).length;

  // Calculate the Pearson correlation coefficient
  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (let i = 0; i < user1.length; i++) {
    if (user1[i] !== -1 && user2[i] !== -1) {
      const rap = user1[i] - ra;
      //console.log(`user1[${i}]: ${user1[i]}, rap: ${rap}`);
      const rbp = user2[i] - rb;
      //console.log(`user2[${i}]: ${user2[i]}, rbp: ${rbp}`);
      numerator += rap * rbp;
      denominator1 += rap * rap;
      denominator2 += rbp * rbp;
    }
  }

  const denominator = Math.sqrt(denominator1) * Math.sqrt(denominator2);

  if (denominator === 0) {
    return 0; 
  }

  
  if (isNaN(numerator / denominator)) {
    return 0;
  } else {
    return (numerator / denominator);
  }
}

// Predict missing ratings
for (let userIndex = 0; userIndex < numUsers; userIndex++) {
  for (let itemIndex = 0; itemIndex < numItems; itemIndex++) {
    if (userItemMatrix[userIndex][itemIndex] === -1) {
      const user = userRatings[userIndex];

      // Find the k nearest neighbors based on Pearson correlation
      const userSimilarities = [];

      for (
        let otherUserIndex = 0;
        otherUserIndex < numUsers;
        otherUserIndex++
      ) {
        if (otherUserIndex !== userIndex) {
          const otherUser = userRatings[otherUserIndex];
          const similarity = pearsonCorrelation(user, otherUser);
          userSimilarities.push({ index: otherUserIndex, similarity });
        }
      }

      userSimilarities.sort((a, b) => b.similarity - a.similarity);
      const kNeighbors = userSimilarities.slice(0, neighborhoodSize);

      // Predict the rating
      let prediction = 0;
      let totalSimilarity = 0;

      for (const neighbor of kNeighbors) {
        const neighborIndex = neighbor.index;
        const similarity = neighbor.similarity;
        const neighborRating = userRatings[neighborIndex][itemIndex];
        if (neighborRating !== -1) {
          const neighborMean =
            userRatings[neighborIndex].reduce(
              (acc, rating) => (rating !== -1 ? acc + rating : acc),
              0
            ) /
            userRatings[neighborIndex].filter((rating) => rating !== -1).length;
          prediction += similarity * (neighborRating - neighborMean);

          totalSimilarity += parseFloat(similarity);
        }
      }

      if (totalSimilarity !== 0) {
        const rap =
          user.reduce(
            (acc, rating) => (rating !== -1 ? acc + rating : acc),
            0
          ) / user.filter((rating) => rating !== -1).length;
        prediction = rap + prediction / totalSimilarity;
        userItemMatrix[userIndex][itemIndex] = prediction;
      }
    }
  }
}

// Print the completed matrix with predicted ratings in the desired format
console.log(`${numUsers} ${numItems}`);
console.log(users.join(" "));
console.log(items.join(" "));

for (let i = 0; i < numUsers; i++) {
  const row = userItemMatrix[i].map((rating) =>
    rating !== -1 ? rating.toFixed(2) : -1
  );
  console.log(row.join(" "));
}
