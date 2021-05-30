const { Pool } = require("pg");
const CLIENT = new Pool({
  user: "postgres",
  password: "ol--@nife--123shuga",
  host: "localhost",
  port: 5432,
  database: "postgres"
})

module.exports = CLIENT;