// Modul yang diperlukan
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const fileUpload = require("express-fileupload");
const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql");

// Inisiasi Express & Port
const app = express();
const port = process.env.PORT || 3000;

// Atur View Engine dan Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());

// Koneksi ke database
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "foodorderingwebsitedb",
});
connection.connect();

// Rute User
app.get("/", renderIndexPage);
app.get("/signup", renderSignUpPage);
app.post("/signup", signUpUser);
app.get("/signin", renderSignInPage);
app.post("/signin", signInUser);
app.get("/homepage", renderHomePage);
app.get("/cart", renderCart);
app.post("/cart", updateCart);
app.post("/checkout", checkout);
app.get("/confirmation", renderConfirmationPage);

// Rute Admin
app.get("/admin_signin", renderAdminSignInPage);
app.post("/admin_signin", adminSignIn);
app.get("/adminHomepage", renderAdminHomepage);
app.get("/admin_addFood", renderAddFoodPage);
app.post("/admin_addFood", addFood);
app.get("/admin_change_price", renderChangePricePage);
app.post("/admin_change_price", changePrice);
app.get("/logout", logout);

// Index
function renderIndexPage(req, res) {
  res.render("index");
}

// User Sign-up
function renderSignUpPage(req, res) {
  res.render("signup");
}
function signUpUser(req, res) {
  const { name, email, password } = req.body;
  connection.query(
    "INSERT INTO users (user_name, user_email, user_password) VALUES (?, ?, ?)",
    [name, email, password],
    function (error, results) {
      if (error) {
        console.log(error);
      } else {
        res.render("signin");
      }
    }
  );
}

// User Sign-in
function renderSignInPage(req, res) {
  res.render("signin");
}
function signInUser(req, res) {
  const { email, password } = req.body;
  connection.query(
    "SELECT user_id, user_name, user_email, user_password FROM users WHERE user_email = ?",
    [email],
    function (error, results) {
      if (error || !results.length || results[0].user_password !== password) {
        res.render("signin");
      } else {
        const { user_id, user_name } = results[0];
        res.cookie("cookuid", user_id);
        res.cookie("cookuname", user_name);
        res.redirect("/homepage");
      }
    }
  );
}

// HomePage
function renderHomePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query("SELECT * FROM menu", function (error, results) {
          if (!error) {
            res.render("homepage", {
              username: userName,
              userid: userId,
              items: results,
            });
          }
        });
      } else {
        res.render("signin");
      }
    }
  );
}

// Cart
function renderCart(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("cart", {
          username: userName,
          userid: userId,
          items: citemdetails,
          item_count: item_in_cart,
        });
      } else {
        res.render("signin");
      }
    }
  );
}

// Perbarui Cart
function updateCart(req, res) {
  const cartItems = req.body.cart;
  const uniqueItems = [...new Set(cartItems)];
  // Fungsi untuk mengambil detail item di keranjang
  getItemDetails(uniqueItems, uniqueItems.length);
}
let citems = [];
let citemdetails = [];
let item_in_cart = 0;
function getItemDetails(citems, size) {
  citems.forEach((item) => {
    connection.query(
      "SELECT * FROM menu WHERE item_id = ?",
      [item],
      function (error, results_item) {
        if (!error && results_item.length) {
          citemdetails.push(results_item[0]);
        }
      }
    );
  });
  item_in_cart = size;
}

// Checkout
function checkout(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        const { itemid, quantity, subprice } = req.body;
        const userid = userId;
        const currDate = new Date();

        if (
          Array.isArray(itemid) &&
          Array.isArray(quantity) &&
          Array.isArray(subprice)
        ) {
          itemid.forEach((item, index) => {
            if (quantity[index] != 0) {
              connection.query(
                "INSERT INTO orders (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  uuidv4(),
                  userid,
                  item,
                  quantity[index],
                  subprice[index] * quantity[index],
                  currDate,
                ],
                function (error, results, fields) {
                  if (error) {
                    console.log(error);
                    res.sendStatus(500);
                  }
                }
              );
            }
          });
        } else {
          if (quantity != 0) {
            connection.query(
              "INSERT INTO orders (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
              [
                uuidv4(),
                userid,
                itemid,
                quantity,
                subprice * quantity,
                currDate,
              ],
              function (error, results, fields) {
                if (error) {
                  console.log(error);
                  res.sendStatus(500);
                }
              }
            );
          }
        }

        citems = [];
        citemdetails = [];
        item_in_cart = 0;
        getItemDetails(citems, 0);
        res.render("confirmation", { username: userName, userid: userId });
      } else {
        res.render("signin");
      }
    }
  );
}

// Confirmation
function renderConfirmationPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("confirmation", { username: userName, userid: userId });
      } else {
        res.render("signin");
      }
    }
  );
}


// Admin Homepage
function renderAdminHomepage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_email = ? and admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("adminHomepage", {
          username: userName,
          userid: userId,
          items: results,
        });
      } else {
        res.render("admin_signin");
      }
    }
  );
}

// Admin Sign-in

function renderAdminSignInPage(req, res) {
  res.render("admin_signin");
}

function adminSignIn(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_email = ? AND admin_password = ?",
    [email, password],
    function (error, results) {
      if (error || !results.length) {
        res.render("admin_signin");
      } else {
        const { admin_id, admin_name } = results[0];
        res.cookie("cookuid", admin_id);
        res.cookie("cookuname", admin_name);
        res.render("adminHomepage");
      }
    }
  );
}

// Render Add Food Page
function renderAddFoodPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? and admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("admin_addFood", {
          username: userName,
          userid: userId,
          items: results,
        });
      } else {
        res.render("admin_signin");
      }
    }
  );
}

// Add Food
function addFood(req, res) {
  const {
    FoodName,
    FoodCategory,
    FoodPrice,
  } = req.body;
  if (!req.files) {
    return res.status(400).send("Image was not uploaded");
  }
  const fimage = req.files.FoodImg;
  const fimage_name = fimage.name;
  if (fimage.mimetype == "image/jpeg" || fimage.mimetype == "image/png") {
    fimage.mv("public/images/dish/" + fimage_name, function (err) {
      if (err) {
        return res.status(500).send(err);
      }
      connection.query(
        "INSERT INTO menu (item_name, item_category, item_price, item_img) VALUES (?, ?, ?, ?)",
        [
          FoodName,
          FoodCategory,
          FoodPrice,
          fimage_name,
        ],
        function (error, results) {
          if (error) {
            console.log(error);
          } else {
            res.redirect("admin_addFood");
          }
        }
      );
    });
  } else {
    res.render("admin_addFood");
  }
}

// Admin Change Price
function renderChangePricePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? and admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query("SELECT * FROM menu", function (error, results) {
          if (!error) {
            res.render("admin_change_price", {
              username: userName,
              items: results,
            });
          }
        });
      } else {
        res.render("signin");
      }
    }
  );
}

// Change Price
function changePrice(req, res) {
  const item_name = req.body.item_name;
  const new_food_price = req.body.NewFoodPrice;
  connection.query(
    "SELECT item_name FROM menu WHERE item_name = ?",
    [item_name],
    function (error, results1) {
      if (!error && results1.length) {
        connection.query(
          "UPDATE menu SET item_price = ? WHERE item_name = ?",
          [new_food_price, item_name],
          function (error, results2) {
            if (!error) {
              res.render("adminHomepage");
            } else {
              res.status(500).send("Something went wrong");
            }
          }
        );
      } else {
        res.status(500).send("Something went wrong");
      }
    }
  );
}

app.get("/admin_delete_menu", (req, res) => {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? AND admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query("SELECT * FROM menu", function (err, items) {
          if (!err) {
            res.render("admin_delete_menu", {
              username: userName,
              userid: userId,
              items: items,
            });
          }
        });
      } else {
        res.render("signin");
      }
    }
  );
});

// Logika hapus menu
app.post("/admin_delete_menu", (req, res) => {
  const { item_name } = req.body;
  if (item_name === "None") {
    res.redirect("/admin_delete_menu"); // Jika tidak memilih menu, kembali ke halaman
  } else {
    connection.query(
      "DELETE FROM menu WHERE item_name = ?",
      [item_name],
      function (error, results) {
        if (error) {
          console.log(error);
          res.status(500).send("Gagal menghapus menu.");
        } else {
          res.redirect("/adminHomepage"); // Kembali ke halaman admin setelah berhasil
        }
      }
    );
  }
});


// Logout
function logout(req, res) {
  res.clearCookie();
  return res.redirect("/signin");
}

module.exports = app;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
