# MedcareAssist Project (2.2-Project)

Welcome to the **MedcareAssist** Project. This system provides a comprehensive solution for medical reservations, pharmacy stock management, and patient handling.

## 🛠️ Project Structure
This project is divided into two main components:
* **Frontend**: Built with React and Vite (located in the `/Frontend` directory).
* **Backend**: Built with PHP and MySQL (located in the `/Backend` directory).

---

## 🚀 Setup Instructions

### 1. Database Setup
1. Ensure you have **XAMPP** (or any similar local server stack) installed.
2. Start the **Apache** and **MySQL** services in the XAMPP Control Panel.
3. Open phpMyAdmin (usually `http://localhost/phpmyadmin`).
4. Create a new database named `medcare_assist`.
5. Import the SQL file located at `/database/medcare_assist_db_08_13.sql` into the newly created database.

### 2. Backend Setup
1. The project must be placed inside the `htdocs` directory of your XAMPP installation (e.g., `C:\xampp\htdocs\Project 2.2`).
2. The backend API is located in the `/Backend` directory and will be served automatically via Apache.
3. If necessary, check the database connection settings inside the `Backend/config` folder to ensure the credentials match your MySQL setup.

### 3. Frontend Setup
1. Open a terminal and navigate to the Frontend directory:
   ```bash
   cd "Frontend"
   ```
2. Install the necessary NPM dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### 4. External Access (ngrok)
If you need to expose the local server to the internet for testing (e.g., for external API webhooks or mobile access), use the following ngrok command:
```bash
ngrok http --domain=unextortable-jefferey-sneerless.ngrok-free.dev 80
```
*(Make sure ngrok is installed on your system before running this command).*
