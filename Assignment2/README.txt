Name: Justine Yap
Student Number: 101180098

Dependencies:
    - JavaScript runtime (Node.js)
Environment:
    - Node.js version v18.17.1

Contents:
README.txt
    - readme file for this submission
testFiles
    1.) assignment2-data.txt
        - provided data for this assignment
Item-based Algorithm Files
    1.) item.js
        - top-k neighbors approach
        - ignore negative similarities
        To test this file: 
            - make sure you are in Àssignment2` folder
            - type 'npm run item' in terminal or `node item.js`
        Parameters that can be manipulated
        a.) neighborhood size
            - change neighborhood size by the value of variable `defaultNeighborhoodSize`
        b.) item threshold
            - change item threshold size by the value of variable `itemThreshold`
            - uncomment 
                `if (commonRatings.size < itemThreshold) {
                    continue; 
                }`
        
    2.) itemThres.js
        - threshold-based approach
        - ignore negative similarities
        To test this file: 
            - make sure you are in Àssignment2` folder
            - type 'npm run itemThres' in terminal or `node itemThres.js`
        Parameters that can be manipulated
        a.) similarity threshold
            - change similarity threshold by the value of variable `similarityThreshold`
        b.) item threshold
            - change item threshold size by the value of variable `itemThreshold`
            - uncomment 
                `if (commonRatings.size < itemThreshold) {
                    continue; 
                }`
    
    3.) negativeItem.js
        - top-k neighbors approach
        - include negative similarities
        To test this file: 
            - make sure you are in Àssignment2` folder
            - type 'npm run nitem' in terminal or `node negativeItem.js`
        Parameters that can be manipulated
        a.) neighborhood size
            - change neighborhood size by the value of variable `defaultNeighborhoodSize`
        b.) item threshold
            - change item threshold size by the value of variable `itemThreshold`
            - uncomment 
                `if (commonRatings.size < itemThreshold) {
                    continue; 
                }`

    4.) negativeItemThres.js
        - threshold-based approach
        - include negative similarities
        To test this file: 
            - make sure you are in Àssignment2` folder
            - type 'npm run nitemThres' in terminal or `node negativeItemThres.js`
        Parameters that can be manipulated
        a.) similarity threshold
            - change similarity threshold by the value of variable `similarityThreshold`
        b.) item threshold
            - change item threshold size by the value of variable `itemThreshold`
            - uncomment 
                `if (commonRatings.size < itemThreshold) {
                    continue; 
                }`
User-based Algorithm Files
    1.) user.js
        - top-k neighbors approach
        - ignore negative similarities
        To test this file: 
            - make sure you are in Àssignment2` folder
            - type 'npm run user' in terminal or `node user.js`
        Parameters that can be manipulated
        a.) neighborhood size
            - change neighborhood size by the value of variable `defaultNeighborhoodSize`
        b.) user threshold
            - change user threshold size by the value of variable `userThreshold`
            - uncomment 
                `if (ratingsMatrix[otherUserIndex].filter((rating) => rating !== 0).length < userThreshold) {
                    continue; 
                }`
        
    2.) userThres.js
        - threshold-based approach
        - ignore negative similarities
        To test this file: 
            - make sure you are in Àssignment2` folder
            - type 'npm run userThres' in terminal or `node userThres.js`
        Parameters that can be manipulated
        a.) similarity threshold
            - change similarity threshold by the value of variable `similarityThreshold`
        b.) user threshold
            - change user threshold size by the value of variable `userThreshold`
            - uncomment 
                `if (ratingsMatrix[otherUserIndex].filter((rating) => rating !== 0).length < userThreshold) {
                    continue; 
                }`
    
    3.) negativeUser.js
        - top-k neighbors approach
        - include negative similarities
        To test this file: 
            - make sure you are in Àssignment2` folder
            - type 'npm run nuser' in terminal or `node negativeUser.js`
        Parameters that can be manipulated
        a.) neighborhood size
            - change neighborhood size by the value of variable `defaultNeighborhoodSize`
        b.) user threshold
            - change user threshold size by the value of variable `userThreshold`
            - uncomment 
                `if (ratingsMatrix[otherUserIndex].filter((rating) => rating !== 0).length < userThreshold) {
                    continue; 
                }`

    4.) negativeUserThres.js
        - threshold-based approach
        - include negative similarities
        To test this file: 
            - make sure you are in Àssignment2` folder
            - type 'npm run nUserThres' in terminal or `node negativeUserThres.js`
        Parameters that can be manipulated
        a.) similarity threshold
            - change similarity threshold by the value of variable `similarityThreshold`
        b.) user threshold
            - change user threshold size by the value of variable `userThreshold`
            - uncomment 
                `if (ratingsMatrix[otherUserIndex].filter((rating) => rating !== 0).length < userThreshold) {
                    continue; 
                }`