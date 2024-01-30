const express = require("express");
const sharp = require("sharp");
const { createCanvas, registerFont } = require("canvas");
const axios = require("axios");
let database = {};
(async function () {
  database = JSON.parse(await require("./db-api").get());
})();
function generateRandomString(length) {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
}
function getFutureDate() {
  // Get current date
  const currentDate = new Date();

  // Calculate future date (3 months from now)
  const futureDate = new Date();
  futureDate.setMonth(currentDate.getMonth() + 3);

  // Define months array
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Format the date
  const formattedDate = `${
    months[futureDate.getMonth()]
  } ${futureDate.getDate()}, ${futureDate.getFullYear()}`;

  return formattedDate;
}
function addThreeMonthsToUnixTime() {
  // Get the current Unix timestamp in milliseconds
  const currentUnixTime = Date.now();

  // Create a new Date object based on the current Unix time
  const currentDate = new Date(currentUnixTime);

  // Add 3 months to the current date
  currentDate.setMonth(currentDate.getMonth() + 3);

  // Get the new Unix timestamp after adding 3 months
  const newUnixTime = currentDate.getTime();

  return newUnixTime;
}

const app = express();
const PORT = 3000;
function writeText(text, x, y) {
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  canvas.width = 1000;
  canvas.height = 500;
  const fontSize = 32;
  ctx.font = `${fontSize}px DINRoundPro`;

  ctx.fillText(text, x, y);

  // Convert the canvas to a Buffer
  return canvas.toBuffer();
}
// Register the font
registerFont("fonts/DINRoundPro.ttf", { family: "DIN Round Pro" });
function getCurrentFormattedDate() {
  // Get the current date and time
  let currentDate = new Date();

  // Define the format options
  let options = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "long",
    day: "2-digit",
    year: "numeric",
  };

  // Create a date formatter with the specified options
  let formatter = new Intl.DateTimeFormat("en-US", options);

  // Format the current date
  let formattedDate = formatter.format(currentDate);

  return formattedDate;
}

function gen(name, age, idd) {
  const imagePath = "public/image.png";
  const image = sharp(imagePath);
  let id = getFutureDate();
  if (!database[idd].expiryFormatted) {
    database[idd].expiryFormatted = getFutureDate();
  }
  if (!database[idd].ef) {
    database[idd].ef = getCurrentFormattedDate();
  }
  let a = addThreeMonthsToUnixTime();
  const buffer1 = writeText(name, 410, 145);
  const buffer2 = writeText(age, 410, 179);
  const buffer3 = writeText(database[idd].expiryFormatted || id, 410, 213);
  const buffer4 = writeText(idd, 410, 248);
  const buffer5 = writeText(
    database[idd].ef || getCurrentFormattedDate(),
    410,
    281
  );
  image.composite([
    { input: buffer1, gravity: "northwest" },
    { input: buffer2, gravity: "northwest" },
    { input: buffer3, gravity: "northwest" },
    { input: buffer4, gravity: "northwest" },
    { input: buffer5, gravity: "northwest" },
  ]);

  return { image: image, id: a };
}
app.get("/generate", (req, res) => {
  let key = generateRandomString(16);
  let name = req.query.name;

  let dc = req.query.dc;
  let age = req.query.age;
  if (!dc || dc === "") res.send("Error");
  if (!name || name === "") res.send("error");
  if (!age) age = "Unknown";
  database[key] = {};
  database[key].name = name;
  database[key].age = age;
  database[key].dc = dc;
  let embeds = [
    {
      title: "New Request",
      color: 0xff0000,
      footer: {
        text: `📅 ${getCurrentFormattedDate()}`,
      },
      fields: [
        {
          name: "Name",
          value: name,
        },
        {
          name: "Age",
          value: age,
        },
        {
          name: "Key",
          value: key,
        },
        {
          name: "DC",
          value: dc,
        },
      ],
    },
  ];
  let data = JSON.stringify({ embeds });

  var config = {
    method: "POST",
    url: "https://discordapp.com/api/webhooks/1201677814424940585/cMhxfGgAgMd_DxINKbhPvp2CVoAJz2lWlERopluIrh8bCFH8On3cy0ahi7Z8VdiVlym0", // https://discord.com/webhook/url/here
    headers: { "Content-Type": "application/json" },
    data: data,
  };

  require("./db-api").upload(database);
  axios(config)
    .then((response) => {
      console.log("Webhook delivered successfully");
      res.status(200).send("Ok");
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Internal server error...");
    });
});
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
app.get("/checking", (req, res) => {
  res.sendFile(__dirname + "/public/check.html");
});
app.get("/check", (req, res) => {
  console.log(database[req.query.key].expiry);
  if (database[req.query.key] && database[req.query.key].expiry > Date.now()) {
    res.send({
      name: database[req.query.key].name,
      age: database[req.query.key].age,
    });
  } else {
    res.status(500).send("Invalid Key");
  }
});
app.get("/get", (req, res) => {
  if (database[req.query.key]) {
    let image = gen(
      database[req.query.key].name,
      database[req.query.key].age,
      req.query.key
    );
    database[req.query.key].expiry = image.id;
    require("./db-api").upload(database);
    res.set("Content-Type", "image/png");
    image.image.toBuffer((err, data, info) => {
      if (err) {
        res.status(500).send("Error processing image");
      } else {
        res.send(data);
      }
    });
  } else {
    res.status(500).send("Invalid Key");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
