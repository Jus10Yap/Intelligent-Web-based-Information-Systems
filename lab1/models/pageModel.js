const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let pageSchema = new Schema({
    url: String,
    content: String,
    outgoingLinks: [String]
});

module.exports = mongoose.model("Page", pageSchema);