-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS GolfCourseDB;

-- Switch to the target database
USE GolfCourseDB;

-- Drop tables in an order that respects foreign key constraints (dependents first)
DROP TABLE IF EXISTS MANAGES;
DROP TABLE IF EXISTS MEMBER_TEE_TIME;
DROP TABLE IF EXISTS EQUIPMENT_RENTAL;
DROP TABLE IF EXISTS EMPLOYEE_CONTACT;
DROP TABLE IF EXISTS EQUIPMENT;
DROP TABLE IF EXISTS MEMBER; -- Depends on users, MEMBERSHIP_PLAN
DROP TABLE IF EXISTS EMPLOYEE;
DROP TABLE IF EXISTS TEE_TIME; -- Depends on GOLF_COURSE
DROP TABLE IF EXISTS users; -- Referenced by MEMBER
-- *** Drop PLAN_DISCOUNT BEFORE MEMBERSHIP_PLAN ***
DROP TABLE IF EXISTS PLAN_DISCOUNT; -- Depends on MEMBERSHIP_PLAN
DROP TABLE IF EXISTS MEMBERSHIP_PLAN; -- Safe to drop now
DROP TABLE IF EXISTS EQUIPMENT_TYPE; -- Referenced by EQUIPMENT
DROP TABLE IF EXISTS HOLE;
DROP TABLE IF EXISTS GOLF_COURSE; -- Referenced by TEE_TIME


-- === CREATE TABLES WITH NEW STRUCTURE ===

-- GOLF_COURSE Table
CREATE TABLE GOLF_COURSE (
    Course_id INT PRIMARY KEY AUTO_INCREMENT,
    Course_name VARCHAR(255) NOT NULL,
    Status VARCHAR(50)
);

-- HOLE Table
CREATE TABLE HOLE (
    Hole_id INT PRIMARY KEY AUTO_INCREMENT,
    Par INT,
    Distance_to_pin INT
);

-- MEMBERSHIP_PLAN Table
CREATE TABLE MEMBERSHIP_PLAN (
    Plan_id VARCHAR(50) PRIMARY KEY,
    Fees DECIMAL(10, 2),
    Plan_type VARCHAR(50) UNIQUE NOT NULL,
    Plan_start_date DATE,
    Plan_end_date DATE
);

-- PLAN_DISCOUNT Table
CREATE TABLE PLAN_DISCOUNT (
    Plan_type VARCHAR(50) PRIMARY KEY,
    Rental_discount DECIMAL(5, 2),
    FOREIGN KEY (Plan_type) REFERENCES MEMBERSHIP_PLAN(Plan_type) ON DELETE CASCADE ON UPDATE CASCADE
);

-- EQUIPMENT_TYPE Table
CREATE TABLE EQUIPMENT_TYPE (
    Type VARCHAR(50) PRIMARY KEY,
    Rental_fee DECIMAL(10, 2)
);

-- EQUIPMENT Table
CREATE TABLE EQUIPMENT (
    Equipment_id INT PRIMARY KEY AUTO_INCREMENT,
    Type VARCHAR(50),
    Availability BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (Type) REFERENCES EQUIPMENT_TYPE(Type) ON DELETE CASCADE ON UPDATE CASCADE
);

-- EMPLOYEE Table
CREATE TABLE EMPLOYEE (
    Emp_id INT PRIMARY KEY AUTO_INCREMENT,
    Emp_lname VARCHAR(255),
    Emp_fname VARCHAR(255),
    Role VARCHAR(50)
);

-- EMPLOYEE_CONTACT Table
CREATE TABLE EMPLOYEE_CONTACT (
    Contact_id INT PRIMARY KEY AUTO_INCREMENT,
    Emp_id INT,
    Email VARCHAR(255),
    Phone_number VARCHAR(20),
    FOREIGN KEY (Emp_id) REFERENCES EMPLOYEE(Emp_id) ON DELETE CASCADE
);

-- TEE_TIME Table (Modified: Removed Booked_member_id)
CREATE TABLE TEE_TIME (
    Tee_time_id INT PRIMARY KEY AUTO_INCREMENT,
    Date DATE,
    Time TIME,
    Status VARCHAR(50) DEFAULT 'Available',
    Available_slots INT DEFAULT 4 NOT NULL CHECK (Available_slots >= 0),
    Course_id INT,
    FOREIGN KEY (Course_id) REFERENCES GOLF_COURSE(Course_id) ON DELETE SET NULL
);

-- Users table for authentication (Needed before MEMBER)
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee', 'member') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_username ON users (username);

-- MEMBER Table (Modified: uses user_id, includes contact info)
CREATE TABLE MEMBER (
    user_id INT PRIMARY KEY,
    Member_plan_id VARCHAR(50) NULL,
    Lname VARCHAR(255) NOT NULL,
    Fname VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NULL UNIQUE,
    Phone_number VARCHAR(20) NULL,
    JoinDate DATE DEFAULT (CURDATE()),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (Member_plan_id) REFERENCES MEMBERSHIP_PLAN(Plan_id) ON DELETE SET NULL
);

-- MEMBER_TEE_TIME Table (Modified: uses user_id)
CREATE TABLE MEMBER_TEE_TIME (
    user_id INT,
    Tee_time_id INT,
    PRIMARY KEY (user_id, Tee_time_id),
    FOREIGN KEY (user_id) REFERENCES MEMBER(user_id) ON DELETE CASCADE,
    FOREIGN KEY (Tee_time_id) REFERENCES TEE_TIME(Tee_time_id) ON DELETE CASCADE
);

-- MANAGES Table
CREATE TABLE MANAGES (
    Emp_id INT,
    Equipment_id INT,
    Management_date DATE,
    PRIMARY KEY (Emp_id, Equipment_id),
    FOREIGN KEY (Emp_id) REFERENCES EMPLOYEE(Emp_id) ON DELETE CASCADE,
    FOREIGN KEY (Equipment_id) REFERENCES EQUIPMENT(Equipment_id) ON DELETE CASCADE
);

-- EQUIPMENT_RENTAL Table (Modified: uses user_id)
CREATE TABLE EQUIPMENT_RENTAL (
   Rental_id INT PRIMARY KEY AUTO_INCREMENT,
   user_id INT,
   Equipment_id INT,
   Rental_date DATE,
   Return_date DATE,
   Returned BOOLEAN DEFAULT FALSE,
   FOREIGN KEY (user_id) REFERENCES MEMBER(user_id) ON DELETE SET NULL,
   FOREIGN KEY (Equipment_id) REFERENCES EQUIPMENT(Equipment_id) ON DELETE CASCADE
);


-- === INSERT SAMPLE DATA (Compatible with NEW schema - NO initial admin) ===

INSERT INTO GOLF_COURSE (Course_name, Status) VALUES ('Virginia Tech Golf Course', 'Open');
INSERT INTO HOLE (Par, Distance_to_pin) VALUES (4, 372), (4, 370), (3, 188), (5, 528), (4, 351), (4, 359), (4, 422), (3, 167), (5, 501);
INSERT INTO MEMBERSHIP_PLAN (Plan_id, Fees, Plan_type, Plan_start_date, Plan_end_date) VALUES ('VT_STUDENT', 500.00, 'Student', '2025-01-01', '2025-12-31'),('VT_FACULTY', 750.00, 'Faculty', '2025-01-01', '2025-12-31'),('VT_ALUMNI', 600.00, 'Alumni', '2025-01-01', '2025-12-31'),('VT_PUBLIC', 900.00, 'Public', '2025-01-01', '2025-12-31');
INSERT INTO PLAN_DISCOUNT (Plan_type, Rental_discount) VALUES ('Student', 0.20), ('Faculty', 0.15), ('Alumni', 0.10), ('Public', 0.05);
INSERT INTO EQUIPMENT_TYPE (Type, Rental_fee) VALUES ('Golf Clubs', 30.00), ('Golf Cart', 50.00), ('Push Cart', 15.00), ('Golf Shoes', 10.00), ('Golf Balls', 5.00);
INSERT INTO EQUIPMENT (Type, Availability) VALUES ('Golf Clubs', TRUE), ('Golf Clubs', TRUE),('Golf Cart', TRUE), ('Golf Cart', FALSE),('Push Cart', TRUE), ('Push Cart', TRUE),('Golf Shoes', TRUE), ('Golf Shoes', TRUE),('Golf Balls', TRUE), ('Golf Balls', TRUE);
INSERT INTO EMPLOYEE (Emp_lname, Emp_fname, Role) VALUES ('Smith', 'Robert', 'Manager'), ('Johnson', 'Linda', 'Pro Shop Staff'), ('Williams', 'James', 'Groundskeeper'),('Brown', 'Patricia', 'Instructor'), ('Jones', 'Charles', 'Pro Shop Staff');
INSERT INTO EMPLOYEE_CONTACT (Emp_id, Email, Phone_number) VALUES (1, 'robert.smith@example.com', '540-123-4567'), (2, 'linda.johnson@example.com', '540-987-6543'),(3, 'james.williams@example.com', '540-111-2222'), (4, 'patricia.brown@example.com', '540-333-4444'),(5, 'charles.jones@example.com', '540-555-6666');
INSERT INTO TEE_TIME (Date, Time, Available_slots, Course_id) VALUES ('2025-05-10', '08:00:00', 4, 1), ('2025-05-10', '09:00:00', 4, 1), ('2025-05-11', '10:00:00', 4, 1), ('2025-05-11', '11:00:00', 4, 1), ('2025-05-12', '12:00:00', 4, 1);
INSERT INTO MANAGES (Emp_id, Equipment_id, Management_date) VALUES (1, 1, '2025-03-23'), (2, 2, '2025-03-23'), (3, 3, '2025-03-24'), (4, 4, '2025-03-24'), (5, 5, '2025-03-25');
-- No initial users, members, member_tee_time, or equipment_rental inserted here

SELECT 'Database schema created/reset (NEW STRUCTURE - FOR FIRST ADMIN SIGNUP) and minimal sample data inserted.' AS Status;