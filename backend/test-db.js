const pool = require("./config/db");

setTimeout(() => {
  pool.end();
}, 3000);