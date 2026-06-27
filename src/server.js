const http = require('http');
const handleRequest = require('./app');

const PORT = process.env.PORT || 3000;

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});