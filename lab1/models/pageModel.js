const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let pageSchema = new Schema({
    url: String,
    content: String,
    outgoingLinks: [String],
    incomingLinks: [String]
});

module.exports = mongoose.model("Page", pageSchema);