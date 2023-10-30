const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/a1', { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.once('open', function() {
    // Drop the DB
    mongoose.connection.db.dropDatabase(function(err, result) {
        if(err) {
            console.error('Error dropping database:', err);
        } else {
            console.log('Dropped database');
        }

        // Close the connection
        mongoose.connection.close();
    });
});
