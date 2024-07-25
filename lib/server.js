const express = require('express');
const path = require('path');
const app = express();

// Folder you want to serve
app.use(express.static('banner'));

// Replace 'public' with the path to the folder you want to serve
// Example: path.join(__dirname, 'yourFolderName')

const PORT = process.env.PORT || 3000; // Default HTTP port

const startServer = () => {
    app.listen(PORT, () => console.log(`HTTP Server running on port ${PORT}`));
    return app;
}

module.exports = { startServer };
