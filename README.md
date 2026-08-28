UPI Guardian
The landing page, signup page, login page and dashboard are connected to the existing Node.js, Express and PostgreSQL backend.
One-time setup
Create a PostgreSQL database named `upi_guardian` (or use your existing hosted PostgreSQL database).
Run `backend/schema.sql` in that database to create the `users` table.
Inside the `backend` folder, copy `.env.example` to `.env` and replace the example values:
```env
   PORT=5000
   DATABASE_URL=your_postgresql_connection_string
   DATABASE_SSL=false
   JWT_SECRET=your_long_random_secret
   ```
Use `DATABASE_SSL=true` for a hosted PostgreSQL provider that requires SSL.
Install and start the backend:
```bash
   cd backend
   npm install
   npm start
   ```
Open `http://localhost:5000` in the browser.
Using port 5000 is recommended because Express now serves both the frontend and backend. Live Server is also supported; keep the backend running on port 5000.
Authentication flow
Get Started opens `signup.html`.
Signup validates the form, hashes the password with bcrypt and stores the user in PostgreSQL.
Successful signup opens `login.html`.
Login checks the email and password and creates a 24-hour JWT session.
Successful login opens `dashboard.html`.
Opening the dashboard without a valid session returns the user to login.
The dashboard profile shows the registered user's name. Click the profile to log out.
The Google login and Forgot Password controls remain visual placeholders because they require separate OAuth/email-recovery configuration.
