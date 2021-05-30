const { Router, json } = require("express"),
      { v4: new_name } = require("uuid"),
      multer = require("multer"),
      fs = require("fs"),
      path = require("path"),
      db = require("../db"),
      router = Router();

router.use(json());

// FILESTORAGE FOR MULTER
const file_storage_eng = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../avatars')),
  filename: (req, file, cb) => cb(null, "db_img" + Math.round(Math.random() * 500) + file.originalname)
});

const upload = multer({ storage: file_storage_eng });


router
  .route("")
  .post(upload.single("avatar"), async (req, res) => {
    try {
      const { name, position, clubname } = req.body;

      if(![ name, position, clubname, req.file ].every(Boolean)) {
        return res
                  .status(400)
                  .json({ message: "Oops! One or more parameters invalid or missing!" });
      } else {
        let { filename } = req.file,
            file_ext = path.extname(filename),
            current_file_path = path.join(__dirname, '../avatars', filename),
            new_file_path = path.join(__dirname, '../avatars', new_name().split("-").join("") + file_ext);

        await fs.rename(
          current_file_path,
          new_file_path,
          err => {
            if(err) res.status(400).json({ message: "Oops! Failed to rename file!" });
          }
        )

        const { base: img_name } = path.parse(new_file_path);

        await db.query(
          "INSERT INTO players (name, position, clubname, avatar) VALUES ($1, $2, $3, $4) RETURNING *",
          [ name, position, clubname, img_name ]
        )
  
        return res
          .status(200)
          .json({ message: "Player added successfully!" });
      }
    } catch (error) {
      return res.status(404).json({ message: `ERROR OCCURED: ` + error.message })
    }
  })
 

router
  .route("/:id")
  .patch(upload.single("avatar"), async (req, res) => { // ADD LOGIC THAT ACCEPTS NEW IMAGE, PROCESS ITS NAME, AND UPDATE IT ON THE SERVER AND IN THE DB
    const { name, position, clubname } = req.body;

    try {
      if(![ name, position, clubname, req.file ].some(Boolean)) {
        return res.status(400).json({ message: "ERROR! Please submit parameter(s) to update" });
      } else {
        const id = +req.params.id,
              results = await db.query("SELECT * FROM players WHERE id = $1", [ id ]),
              [ player ] = results.rows;
        
        if(player) { // CHECKS IF PASSED ID HAS EXISITNG DATA IN THE DB
          if(req.file) {
            let { filename } = req.file,
              file_ext = path.extname(filename),
              uploaded_img_path = path.join(__dirname, '../avatars', filename),
              uploaded_img_renamed = path.join(__dirname, '../avatars', new_name().split("-").join("") + file_ext);

            await fs.rename(
              uploaded_img_path,
              uploaded_img_renamed,
              err => {
                if(err) {
                  res.status(400).json({ message: "Oops! Attempt to update image failed." });
                } else {
                  const former_file = path.join(__dirname, '../avatars', `${player.avatar}`);

                  fs.unlink(former_file, err => {
                    if(err) {
                      res.json({ message: "ERROR! Attempt to update image failed." });
                    } else {
                      const { base: img_name } = path.parse(uploaded_img_renamed);

                      db.query(
                        "UPDATE players SET (name, position, clubname, avatar) = ($1, $2, $3, $4) WHERE id = $5",
                        [ 
                          name ? name : player.name,
                          position ? position : player.position,
                          clubname ? clubname : player.clubname,
                          img_name ? img_name : player.avatar,
                          id
                        ]
                      )

                      return res
                            .status(200)
                            .json({ message: "Player info updated successfully!" });
                    }
                  })
                }
              }
            )
          } else {
            await db.query(
              "UPDATE players SET (name, position, clubname) = ($1, $2, $3) WHERE id = $4",
              [ 
                name ? name : player.name,
                position ? position : player.position,
                clubname ? clubname : player.clubname,
                id
              ]
            )

            return res
                  .status(200)
                  .json({ message: "Player info updated successfully!" });
          }
        } else {
          return res
                .status(404)
                .json({ message: "ERROR! No player with searched ID found!" });
        }
      }
    } catch (error) {
      return res
              .status(404)
              .json({ message: `ERROR! ${error.message}` });
    }
  })
  .get(async (req, res) => {
    const id = +req.params.id;

    try {
      const data = await db.query("SELECT * FROM players WHERE id = $1", [ id ]),
            [ player ] = data.rows;

      if(!player) {
        return res
              .status(404)
              .json({ message: "ERROR! No player with searched ID found!" });
      }

      return res.json(player);
      
    } catch (error) {
      return res.json({ message: `ERROR! ${error.message}` });
    }
  })


router
  .route("/avatar/:id")
  .put(upload.single("avatar"), async (req, res) => {
    const id = req.params.id,
          results = await db.query("SELECT * FROM players WHERE id = $1", [ id ]),
          [ player ] = results.rows;
          
    try {
      if(player) {
        if(req.file) {
          let { filename } = req.file,
            file_ext = path.extname(filename),
            uploaded_img_path = path.join(__dirname, '../avatars', filename),
            uploaded_img_renamed = path.join(__dirname, '../avatars', new_name().split("-").join("") + file_ext);
  
          await fs.rename(
            uploaded_img_path,
            uploaded_img_renamed,
            err => {
              if(err) {
                res.status(400).json({ message: "Oops! Attempt to update avatar failed." });
              } else {
                const former_file = path.join(__dirname, '../avatars', player.avatar);
                fs.unlink(former_file, err => {
                  if(err) {
                    res.json({ message: "ERROR! Attempt to update avatar failed." });
                  } else {
                    const { base: img_name } = path.parse(uploaded_img_renamed);
  
                    db.query(
                      "UPDATE players SET avatar = $1 WHERE id = $2", [ 
                        img_name ? img_name : player.avatar,
                        id
                      ]
                    )
  
                    return res
                          .status(200)
                          .json({ message: "Player avatar changed successfully!" });
                  }
                })
              }
            }
          )
        } else {
          return res.status(400).json({ message: "Oops! You have to upload an avatar." })
        }
      }
    } catch (error) {
      res.status(400).json({ message: `ERROR! ${error.message}` });
    }
  })


module.exports = router;