const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const router = express.Router();

// SIGN UP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please fill in all fields",
      });
    }

    // Check whether email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user in PostgreSQL
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: "Account created successfully",
      user: result.rows[0],
    });

  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;