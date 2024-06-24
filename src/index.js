require('dotenv').config();
const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const path = require('path');

const http = require('http').createServer(app);
const connectDb = require('./config/db');
connectDb();

const routes = require('./routes/index');
const { logger } = require('./utils');

const cors = require('cors');
 
app.use(cors({
  origin: '*'
}));


app.set('views', path.join(__dirname, 'public/mailTemplate'));

app.set('view engine', 'ejs');
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/v1', routes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));


app.get("/", async (req, res) => {
  res.send("Welcome to  API Server");
});


const port = process.env.PORT || 8001;

http.listen(port, () => {
  logger.info(`Server Started in port : ${port}!`);
});

module.exports = app;