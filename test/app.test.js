const request = require("supertest");
const app = require("../app"); // Import aplikasi Express

// Testing semua menu/halaman
describe("Testing all routes in the application", () => {
  // Testing untuk membuka halaman index
  test("GET / should return the index page", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain('<title>Nomojowo</title>');
  });

  // Testing untuk membuka halaman homepage dengan menu
  test("GET /homepage should return the homepage with menu items", async () => {
    const response = await request(app).get("/homepage").set("Cookie", [
      "cookuid=1; cookuname=User",
    ]);
    expect(response.status).toBe(200);
    expect(response.text).toContain("Japanese Katsu Curry"); // Contoh item menu
  });

  // Test untuk membuka halaman cart
  test("GET /cart should render cart page", async () => {
    const response = await request(app).get("/cart").set("Cookie", [
      "cookuid=1; cookuname=User",
    ]);
    expect(response.status).toBe(200);
    expect(response.text).toContain("Cart"); // Sesuaikan dengan konten halaman
  });

  // Testing pada menu menambahkan menu (Admin)
  test("POST /admin_addFood should add food to the menu", async () => {
    const response = await request(app)
      .post("/admin_addFood")
      .set("Cookie", ["cookuid=1; cookuname=admin"])
      .field("FoodName", "Test Dish")
      .field("FoodCategory", "Test Category")
      .field("FoodPrice", 10000)
      .attach("FoodImg", Buffer.from("test image content"), "test.jpg");
    expect(response.status).toBe(302);
  });

  // Testing pada menu mengganti harga (Admin)
  test("POST /admin_change_price should update the price of an item", async () => {
    const response = await request(app)
      .post("/admin_change_price")
      .send({ item_name: "Chicken Katsu", NewFoodPrice: 19000 })
      .set("Cookie", ["cookuid=1; cookuname=admin"]);
    expect(response.status).toBe(200);
  });

  // Testing pada menu checkout (User)
  test("POST /checkout should complete the order process", async () => {
    const response = await request(app)
      .post("/checkout")
      .send({
        itemid: [1],
        quantity: [2],
        subprice: [20000],
      })
      .set("Cookie", ["cookuid=1; cookuname=User"]);
    expect(response.status).toBe(200);
    expect(response.text).toContain("<title>Konfirmasi | Nomojowo</title>");
  });

  // Testing pada menu sign-in admin
  describe("POST /admin_signin", () => {
    test("should log in admin", async () => {
      const response = await request(app)
        .post("/admin_signin")
        .send({ email: "admin@gmail.com", password: "123456789" });
      expect(response.status).toBe(200);
      expect(response.text).toContain("adminHomepage");
    });
  });

  // Testing pada menu sign-up user
  describe("POST /signup", () => {
    test("should register a new user successfully", async () => {
      const response = await request(app)
        .post("/signup")
        .send({
          name: "Test User",
          email: "testuser@example.com",
          password: "password123",
        });
      expect(response.statusCode).toBe(200);
      expect(response.text).toContain("signin");
    });

    test(
      "should fail to register a user if email is missing",
      async () => {
        const response = await request(app)
          .post("/signup")
          .send({
            name: "Test User",
            password: "password123",
          });
        expect(response.statusCode).toBe(400);
      },
      10000 // Timeout untuk tes ini adalah 10 detik
    );
  });

  // Testing pada menu sign-in user
  describe("POST /signin", () => {
    test("should log in an existing user successfully", async () => {
      const response = await request(app)
        .post("/signin")
        .send({
          email: "testuser@example.com",
          password: "password123",
        });
      expect(response.statusCode).toBe(302);
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    test("should fail to log in with incorrect password", async () => {
      const response = await request(app)
        .post("/signin")
        .send({
          email: "testuser@example.com",
          password: "wrongpassword",
        });
      expect(response.statusCode).toBe(200);
      expect(response.text).toContain("signin");
    });

    test("should fail to log in if user does not exist", async () => {
      const response = await request(app)
        .post("/signin")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        });
      expect(response.statusCode).toBe(200);
      expect(response.text).toContain("signin");
    });
  });
});

// Tutup server atau koneksi setelah semua tes selesai
afterAll(async () => {
  if (app.close) {
    await app.close();
  }
});
