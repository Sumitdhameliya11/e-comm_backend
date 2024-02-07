const config = require("./database/mysqlconfig");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const jwtkey = "e-comm";
const path = require('path');
const admin = path.join(__dirname,"public");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(admin));

// ===========file uploading middleware==========
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "upload");
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  }),
}).single("image");

// =======verify token============

function verifytoken(req, res, next) {
  let token = req.headers["authorization"];
  if (token) {
    token = token.split(" ")[2];
    console.log(token);
    jwt.verify(token, jwtkey, (error, valid) => {
      console.log(error);
      if (error) {
        res.status(401).send("provied valied  token");
      } else {
        next();
      }
    });
  } else {
    res.status(403).send("authorized forbin");
  }
}

// ============registration api=========

app.post("/insert", async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const data = {
    fristname: req.body.firstname,
    middlename: req.body.middlename,
    lastname: req.body.lastname,
    email: req.body.email,
    password: hashedPassword,
  };
  config.query("insert into user set?", data, (error, result, fields) => {
    if (error) {
      console.log(error);
      res.send("Error");
    } else {
      res.send(result);
    }
  });
});

// ========login api===========
app.post("/login", async (req, res) => {
  try {
    const { email, password, recaptchavalue } = req.body;

    const recaptchasecretkey = "6Lfq01QpAAAAAGEKOSM36uJ7I0L6YnBkx4anoV61";

    const recaptchacheck = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchasecretkey}&response=${recaptchavalue}`,
      {
        method: "post",
      }
    );

    const recaptchadata = await recaptchacheck.json();

    console.log(recaptchadata);

    if (!recaptchadata.success) {
      return res.status(200).send("recaptch verifiation failed");
    }

    config.query(
      "SELECT * FROM user WHERE email = ?",
      email,
      async (error, result) => {
        if (error) {
          res.status(500).send("Error");
        } else {
          if (result.length > 0) {
            const passMatch = await bcrypt.compare(
              password,
              result[0].password
            );
            if (passMatch) {
              const user = {
                id: result[0].id,
                email: result[0].email,
              };

              jwt.sign({ user }, jwtkey, { expiresIn: "24h" }, (err, token) => {
                if (err) {
                  res.status(500).send("Something went wrong!");
                }
                res.send({ user, auth: token });
              });
            } else {
              res.status(401).send("Authentication failed");
            }
          } else {
            res.status(404).send("User not found");
          }
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
});

// =============add product api=====

app.post("/add_product", verifytoken, upload, (req, res) => {
  let data = {
    product_name: req.body.productname,
    price: req.body.price,
    qty: req.body.qty,
    category: req.body.category,
    subcategory: req.body.subcategory,
    product_image: req.file.originalname,
    description: req.body.description,
  };
  config.query("insert into product set?", data, (error, result, fields) => {
    if (error) {
      res.send(error);
    } else {
      res.send(result);
    }
  });
});

// ============alldata fetch api=====

app.get("/get_product", verifytoken, (req, res) => {
  const query = "select * from product where isdelete='false'";
  config.query(query, (error, result, fields) => {
    if (error) {
      console.log(error);
      res.send("data not found");
    } else {
      res.send(result);
    }
  });
});

// ====specific data fing=======
app.get("/get_product/:id", verifytoken, (req, res) => {
  let data = req.params.id;
  const query = "select * from product where id=?";
  config.query(query, data, (error, result, fields) => {
    if (error) {
      console.log(error);
      res.send("data not found");
    } else {
      console.log(result[0]);
      res.send(result[0]);
    }
  });
});

app.put("/update/:id", verifytoken, (req, res) => {
  const { id } = req.params;
  const { productname, price, qty, category, subcategory, description } =
    req.body;

  const query = `UPDATE product SET 
                 product_name = ?, 
                 price = ?, 
                 qty = ?, 
                 category = ?, 
                 subcategory = ?, 
                 description = ? 
                 WHERE id = ?`;

  config.query(
    query,
    [productname, price, qty, category, subcategory, description, id],
    (err, result) => {
      if (err) {
        console.error("Error updating data:", err);
        res.status(500).json({ error: "Error updating data" });
      } else {
        console.log("Data updated successfully");
        res.send(result);
        res.status(200).json({ message: "Data updated successfully" });
      }
    }
  );
});

app.delete("/delete/:id", verifytoken, (req, res) => {
  let data = req.params.id;
  let query = "update product set  isdelete = 'true' where id=?";
  config.query(query, data, (error, result, fields) => {
    if (error) {
      res.send("data can not  delete", error);
    } else {
      res.send(result);
    }
  });
});

// =======add_to_cart api =======

// Add to cart API endpoint with user_id
app.post("/add_to_cart/:userId/:productId", verifytoken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = req.params.productId;

    console.log(userId);
    console.log(productId);

    const product = await new Promise((resolve, reject) => {
      config.query(
        "SELECT * FROM product WHERE id = ?",
        [productId],
        (error, result, fields) => {
          if (error) {
            console.log(error);
            reject(error);
          } else {
            console.log(result);
            resolve(result);
          }
        }
      );
    });

    if (product[0].qty === 0) {
      await config.query(
        "DELETE FROM cart WHERE user_id = ? AND product_id = ?",
        [userId, productId],
        (error, result, fields) => {
          if (error) {
            console.log(error);
            res.status(500).json({ error: "Error deleting from cart" });
          } else {
            console.log(result);
            res.status(400).json({ error: "Product stock is over" });
          }
        }
      );
    } else {
      const cartItem = {
        user_id: userId,
        product_id: productId,
        qty: 1,
        // Add other details as needed
      };

      // Insert the cart item into the 'cart' table
      config.query(
        "INSERT INTO cart SET ?",
        cartItem,
        (err, insertResult) => {
          if (err) {
            console.error("Error adding to cart:", err);
            res.status(500).json({ error: "Failed to add product to cart" });
          } else {
            console.log("Product added to cart:", insertResult);

            // Send a single response to the client
            res.json({
              message: "Product added to cart and quantity updated",
            });
          }
        }
      );
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Error adding to cart" });
  }
});


// ==========cart table data and product table specific data fetch========

app.get("/add_to_cart/:userid", verifytoken, (req, res) => {
  const userid = req.params.userid;

  query = `select p.*,c.* from cart c , product p where c.product_id = p.id and c.user_id = ?`;

  config.query(query, userid, (error, result) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      res
        .status(200)
        .json({ message: "Two tables are joined successfully", result });
    }
  });
});

// ==========remove cart data (order cancel ) ==========
app.delete(
  "/remove_from_cart/:userId/:productId",
  verifytoken,
  async (req, res) => {
    try {
      const userId = req.params.userId;
      const productId = req.params.productId;

      // Step 1: Remove the product from the cart
      await config.query(
        "DELETE FROM cart WHERE user_id = ? AND product_id = ?",
        [userId, productId]
      );

      // Step 2: Update the product table (e.g., increase the quantity by 1)
      await config.query("UPDATE product SET qty = qty + 1 WHERE id = ?", [
        productId,
      ]);

      res.status(200).json({
        message: "Product removed from cart and product table updated",
      });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ======================= add_to_order api ==========
app.post("/pay_order/:userId/:totalprice", verifytoken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const totalprice = req.params.totalprice;
    console.log(userId);
    console.log(totalprice);

    //Fetch cart details
    const cartItems = await new Promise((res, rej) => {
      config.query(
        "SELECT * FROM cart WHERE user_id = ?",
        [userId],
        (error, result, fields) => {
          if (error) {
            console.log(error);
            rej(error);
          } else {
            // Resolve with the result
            res(result);
          }
        }
      );
    });

    console.log(cartItems[0]);

    // Fetch product details
    const product = await new Promise((res, rej) => {
      config.query(
        "SELECT * FROM product WHERE id = ?",
        [cartItems[0].product_id],
        (error, result, fields) => {
          if (error) {
            console.log(error);
            rej(error);
          } else {
            console.log(result);
            res(result);
          }
        }
      );
    });

    console.log(product[0].price);
    console.log(product[0].id);

    //update qty data
    await config.query(
      "UPDATE product SET qty = qty - 1 WHERE id = ?",
      product[0].id,
    );

    // total  cost  prrice
    const total_price = totalprice;
    console.log(total_price);

    // Insert the order item into the 'orders' table
    await config.query(
      "INSERT INTO buy_now SET user_id = ?, product_id = ?, qty = ?, price = ?, totalprice = ?",
      [
        userId,
        cartItems[0].product_id,
        cartItems[0].qty,
        product[0].price,
        total_price,
      ],
      
    );

    // Remove the item from the cart table
    await config.query(
      "DELETE FROM cart WHERE user_id = ? AND product_id = ?",
      [userId, cartItems[0].product_id]
    );
    res.status(200).json({ message: "Order placed successfully" });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===========fetch all recorde  from buy_now  table ============

app.get("/get_pay_order", async(req, res) => {
  query = "select * from buy_now where  isdeliver  =  'false' "
  config.query(query,(error, result) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.status(200).json({ message: "Two tables are joined successfully", result });
    }
  });
});

// ============fetch pay_order data ====================

app.get("/get_pay_order/:userid", verifytoken, async(req, res) => {
  const userid = req.params.userid;

  const order = await new Promise((resolve,reject)=>{
    query = "select  * from buy_now where user_id = ?  and isdeliver !='Delivered'";
    config.query(query,[userid],(error,result,fields)=>{
      if(error){
        reject(error);
      }else{
        resolve(result);
      }
    });
  })

  query = `select p.*,b.* from buy_now b , product p where b.product_id = p.id and b.user_id = ? and b.id = ?`;

  config.query(query, [userid,order[0].id], (error, result) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    } else {
      res
        .status(200)
        .json({ message: "Two tables are joined successfully", result });
    }
  });
});

//============update buy_now_table==============

app.post('/update_delivery_status', (req, res) => {
  const orderid = req.body.orderid;
  const deliver = req.body.status;
  const query = `UPDATE buy_now SET isdeliver = ? WHERE id = ?`;
  config.query(query, [deliver,orderid], (err) => {
    if (err) {
      console.error('Error updating delivery status:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.status(200).json({ message: 'Delivery status updated successfully' });
    }
  });      
});

// ==================favourite product ===================
app.post("/add_to_favourite/:productId", verifytoken, async (req, res) => {
  const productId = req.params.productId;
  
  const product = await new Promise((res, rej) => {
    config.query(
      "SELECT * FROM product WHERE id = ?",
      [productId],
      (error, result, fields) => {
        if (error) {
          console.log(error);
          rej(error);
        } else {
          //  console.log(result);
          res(result);
        }
      }
    );
  });

  console.log(product[0].id);

  // =========insert recorde in favourite table ========
  await config.query(
    "INSERT INTO favourite SET  product_id = ?,product_name  = ?, price = ?,product_image = ?",
    [
      product[0].id,
      product[0].product_name,
      product[0].price,
      product[0].product_image,
    ],
    (error, result, fields) => {
      if (error) {
        console.log(error);
        res.send(error);
      } else {
        console.log(result);
        res.send(result);
      }
    }
  );
});

// ==========fetch data from favourite=========
app.get("/get_saveproduct", verifytoken, (req, res) => {
  const query = "select * from  favourite";
  config.query(query, (error, result, fields) => {
    if (error) {
      console.log(error);
      res.send("data not found");
    } else {
      res.send(result);
    }
  });
});

//===========otp insert  api===========
app.post("/add_otp", verifytoken, (req, res) => {
  const otp = req.body.otp;
  const r_email = req.body.email;

  const query = "INSERT INTO otp SET otp = ?, r_email = ?";

  config.query(query, [otp, r_email], (error, result, fields) => {
    if (error) {
      console.log(error);
      res.send(error);
    } else {
      console.log(result);
      res.send(result);
    }
  });
});

//=============verify otp and ==========

app.get("/verify_otp/:otp", verifytoken, (req, res) => {
  const otp = req.params.otp;

  console.log(otp);
  if (!otp) {
    res.status(404).send("otp not found");
  }

  query = "select * from otp where otp = ?";

  const data = config.query(query, [otp], (error, result, fields) => {
    if (error) {
      console.log(error);
      res.send(error);
    } else {
      console.log(result);
      res.send(result[0]);
    }
  });

  console.log(data[0]);
});

//==========change password api=========

app.put("/update_password/:userId", verifytoken, async (req, res) => {
  const userId = req.params.userId;
  const oldpassword = req.body.oldpassword;
  const newpassword = req.body.newpassword;

  console.log(userId);
  const data = await new Promise((res, rej) => {
    config.query(
      "SELECT * FROM user WHERE id = ?",
      userId,
      (error, result, fields) => {
        if (error) {
          console.log(error);
          rej(error);
        } else {
          // Resolve with the result
          res(result);
        }
      }
    );
  });

  console.log(data[0]);
  console.log([data[0].password]);

  const isPasswordMatch = await bcrypt.compare(oldpassword, data[0].password);

  if (!isPasswordMatch) {
    return res.status(401).send("Incorrect Old  Password");
  }

  const hashedPassword = await bcrypt.hash(newpassword, 10);
  const query = "UPDATE user SET password = ? WHERE id = ?";

  await config.query(
    query,
    [hashedPassword, userId],
    (error, result, fields) => {
      if (error) {
        console.log(error);
        res.send(error);
      } else {
        console.log(result);
        res.send(result);
      }
    }
  );
});

// =======fetch image api=========
app.use("/uploads", express.static("upload")); // Replace 'upload' with your actual upload directory name

app.listen(5000);
