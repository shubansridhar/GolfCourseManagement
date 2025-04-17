# Golf Course Database Manager

A simple web-based interface for managing the GolfCourseDB database. This application allows you to view, add, and delete records from various tables in the database.

## Features

- View all tables in the database
- View data from any table
- Add new records to tables
- Delete existing records from tables
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- A MySQL database created using the provided `db.sql` script

## Setup Instructions

1. **Clone the repository**

```bash
git clone <repository-url>
cd golf-course-db-manager
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure database connection**

Edit the `.env` file with your MySQL database credentials:

```
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=GolfCourseDB
PORT=3000
```

4. **Create the database**

Make sure to run the `db.sql` script to create the database and tables:

```bash
mysql -u your_mysql_username -p < db.sql
```

5. **Start the application**

```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Usage

1. **Viewing Tables**
   - Select a table from the sidebar to view its data.

2. **Adding Records**
   - Select a table, then click the "Add Record" button.
   - Fill in the form with the required information.
   - Click "Submit" to add the record.

3. **Deleting Records**
   - Select a table to view its data.
   - Click the trash icon next to a record to delete it.
   - Confirm the deletion in the prompt.

## Project Structure

- `server.js` - Express server and API routes
- `public/index.html` - Main HTML file
- `public/styles.css` - CSS styles
- `public/script.js` - Frontend JavaScript
- `db.sql` - Database schema and sample data

## Screenshots

(Screenshots will be provided in the deliverables)

## Notes

- Auto-increment primary key fields are automatically skipped when adding new records.
- The application automatically detects the primary key for each table.
- Input types in forms are determined based on the database column types. 