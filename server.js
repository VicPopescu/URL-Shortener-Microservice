"use strict";

const express = require("express");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const db = mongoose.connection;
const Schema = mongoose.Schema;
const bodyParser = require("body-parser");
const dns = require("dns");
const url = require("url");

mongoose.connect(
  process.env.MONGOLAB_URI,
  { useNewUrlParser: true }
);

db.on("error", console.error.bind(console, "connection error"));
db.once("open", () => console.log("DB ONLINE"));

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/public", express.static(process.cwd() + "/public"));
app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Schema and model
const urlSchema = new Schema({
  id: Number,
  url: { type: String, required: true }
});
const UrlModel = mongoose.model("RedirectUrl", urlSchema);
const invalidUrl = { error: "invalid URL" };

// API

// Save new entry
app.post("/api/shorturl/new", function(req, res) {
  const reqUrl = url.parse(req.body.url);
  const hostName = reqUrl.hostname;

  if(!hostName) {
    res.send(invalidUrl); return false;
  }
  dns.lookup(hostName, function(err, addresses, family) {
    if (err) {
      console.log(err);
      res.send(invalidUrl);
    } else {
      UrlModel.findOne({ url: req.body.url }, function(err, data) {
        if (!data) {
          UrlModel.findOne()
            .sort("-id")
            .exec(function(err, post) {
              if (err) console.log(err);
              const id = !post ? 0 : ++post.id;
              const newUrl = new UrlModel({
                id: id,
                url: req.body.url
              });

              newUrl.save(function(err, data) {
                if (err) console.log(err);
                else res.send({ original_url: req.body.url, short_url: id });
              });
            });
        } else {
          res.send({ original_url: req.body.url, short_url: data.id });
        }
      });
    }
  });
});

// Get entry
app.get("/api/shorturl/:url", function(req, res) {
  const urlId = req.params.url;
  UrlModel.findOne({ id: urlId }, function(err, data) {
    if (err) console.log(err);
    if (!data) res.send('This URL does not exist!');
    else res.redirect(data.url);
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
