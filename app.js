const express = require("express"),
      port = process.env.port || 3000,
      app = express();

app.use("/player", require("./routes/router"));

app.listen(port, console.log(`Server is running at port ${port}`));