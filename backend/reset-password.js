const bcrypt = require("bcrypt");
const pool = require("./config/db");

async function resetPassword() {
  const email = process.argv[2]?.trim().toLowerCase();
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Usage: npm run reset-password -- email@example.com NewPassword123");
    process.exitCode = 1;
    return;
  }

  if (newPassword.length < 8) {
    console.error("The new password must contain at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const result = await pool.query(
    `UPDATE users
     SET password = $1
     WHERE LOWER(email) = LOWER($2)
     RETURNING id, name, email`,
    [passwordHash, email]
  );

  if (result.rows.length === 0) {
    console.error(
      "No user with that email was found. Check that DATABASE_URL points to the same Supabase project shown in the Table Editor."
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Password reset successfully for ${result.rows[0].email}.`);
}

resetPassword()
  .catch((error) => {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
