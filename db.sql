-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS GolfCourseDB;

-- Switch to the target database
USE GolfCourseDB;

-- Drop tables in an order that respects foreign key constraints (dependents first)
DROP TABLE IF EXISTS MANAGES;            -- Depends on EMPLOYEE (now via user_id), EQUIPMENT
DROP TABLE IF EXISTS MEMBER_TEE_TIME;    -- Depends on MEMBER (now via user_id), TEE_TIME
DROP TABLE IF EXISTS EQUIPMENT_RENTAL;   -- Depends on MEMBER (now via user_id), EQUIPMENT
DROP TABLE IF EXISTS EMPLOYEE_CONTACT; -- Will be removed
DROP TABLE IF EXISTS MEMBER_CONTACT;   -- Will be removed
DROP TABLE IF EXISTS MEMBER;           -- Depends on users, MEMBERSHIP_PLAN
DROP TABLE IF EXISTS EMPLOYEE;         -- Depends on users (will be recreated)
DROP TABLE IF EXISTS TEE_TIME;         -- Depends on GOLF_COURSE
DROP TABLE IF EXISTS users;            -- Referenced by MEMBER, EMPLOYEE
DROP TABLE IF EXISTS EQUIPMENT;        -- Depends on EQUIPMENT_TYPE
DROP TABLE IF EXISTS PLAN_DISCOUNT;    -- Depends on MEMBERSHIP_PLAN
DROP TABLE IF EXISTS MEMBERSHIP_PLAN;  -- Referenced by MEMBER, PLAN_DISCOUNT
DROP TABLE IF EXISTS EQUIPMENT_TYPE;   -- Referenced by EQUIPMENT
DROP TABLE IF EXISTS HOLE;
DROP TABLE IF EXISTS GOLF_COURSE;      -- Referenced by TEE_TIME

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

-- TEE_TIME Table (Booked_member_id removed)
CREATE TABLE TEE_TIME (
    Tee_time_id INT PRIMARY KEY AUTO_INCREMENT,
    Date DATE,
    Time TIME,
    Status VARCHAR(50) DEFAULT 'Available',
    Available_slots INT DEFAULT 4 NOT NULL CHECK (Available_slots >= 0),
    Course_id INT,
    FOREIGN KEY (Course_id) REFERENCES GOLF_COURSE(Course_id) ON DELETE SET NULL
);

-- Users table for authentication (Foundation for MEMBER and EMPLOYEE)
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee', 'member') NOT NULL, -- Login role
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_username ON users (username);

-- MEMBER Table (Refactored: uses user_id, includes contact info)
CREATE TABLE MEMBER (
    user_id INT PRIMARY KEY,
    Member_plan_id VARCHAR(50) NULL,
    Lname VARCHAR(255) NOT NULL,
    Fname VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NULL UNIQUE,
    Phone_number VARCHAR(20) NULL,
    Handicap INT NULL,
    JoinDate DATE DEFAULT (CURDATE()),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (Member_plan_id) REFERENCES MEMBERSHIP_PLAN(Plan_id) ON DELETE SET NULL
);

-- EMPLOYEE Table (Refactored: uses user_id, includes contact info, keeps application Role)
CREATE TABLE EMPLOYEE (
    user_id INT PRIMARY KEY,          -- Primary Key, references users table
    Emp_lname VARCHAR(255) NOT NULL,
    Emp_fname VARCHAR(255) NOT NULL,
    Role VARCHAR(50) NOT NULL,        -- Application-specific role (Manager, Staff, etc.)
    Email VARCHAR(255) NULL UNIQUE,
    Phone_number VARCHAR(20) NULL,
    HireDate DATE DEFAULT (CURDATE()), -- Example: Add hire date

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE -- If user deleted, delete employee profile
);

-- MEMBER_TEE_TIME Table (Uses user_id)
CREATE TABLE MEMBER_TEE_TIME (
    user_id INT,
    Tee_time_id INT,
    PRIMARY KEY (user_id, Tee_time_id),
    FOREIGN KEY (user_id) REFERENCES MEMBER(user_id) ON DELETE CASCADE,
    FOREIGN KEY (Tee_time_id) REFERENCES TEE_TIME(Tee_time_id) ON DELETE CASCADE
);

-- MANAGES Table (Refactored: uses user_id for employee link)
CREATE TABLE MANAGES (
    user_id INT,                      -- Changed from Emp_id
    Equipment_id INT,
    Management_date DATE,
    PRIMARY KEY (user_id, Equipment_id), -- Changed PK
    FOREIGN KEY (user_id) REFERENCES EMPLOYEE(user_id) ON DELETE CASCADE, -- Link to EMPLOYEE via user_id
    FOREIGN KEY (Equipment_id) REFERENCES EQUIPMENT(Equipment_id) ON DELETE CASCADE
);

-- EQUIPMENT_RENTAL Table (Uses user_id)
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


-- === INSERT SAMPLE DATA (Compatible with NEW schema - NO initial admin/employees) ===

-- Static Data
INSERT INTO GOLF_COURSE (Course_name, Status) VALUES ('Virginia Tech Golf Course', 'Open');
INSERT INTO HOLE (Par, Distance_to_pin) VALUES (4, 372), (4, 370), (3, 188), (5, 528), (4, 351), (4, 359), (4, 422), (3, 167), (5, 501);
INSERT INTO MEMBERSHIP_PLAN (Plan_id, Fees, Plan_type, Plan_start_date, Plan_end_date) VALUES ('VT_STUDENT', 500.00, 'Student', '2025-01-01', '2025-12-31'),('VT_FACULTY', 750.00, 'Faculty', '2025-01-01', '2025-12-31'),('VT_ALUMNI', 600.00, 'Alumni', '2025-01-01', '2025-12-31'),('VT_PUBLIC', 900.00, 'Public', '2025-01-01', '2025-12-31');
INSERT INTO PLAN_DISCOUNT (Plan_type, Rental_discount) VALUES ('Student', 0.20), ('Faculty', 0.15), ('Alumni', 0.10), ('Public', 0.05);
INSERT INTO EQUIPMENT_TYPE (Type, Rental_fee) VALUES ('Golf Clubs', 30.00), ('Golf Cart', 50.00), ('Push Cart', 15.00), ('Golf Shoes', 10.00), ('Golf Balls', 5.00);
INSERT INTO EQUIPMENT (Type, Availability) VALUES ('Golf Clubs', TRUE), ('Golf Clubs', TRUE),('Golf Cart', TRUE), ('Golf Cart', FALSE),('Push Cart', TRUE), ('Push Cart', TRUE),('Golf Shoes', TRUE), ('Golf Shoes', TRUE),('Golf Balls', TRUE), ('Golf Balls', TRUE);
INSERT INTO TEE_TIME (Date, Time, Available_slots, Course_id) VALUES ('2025-05-10', '08:00:00', 4, 1), ('2025-05-10', '09:00:00', 4, 1), ('2025-05-11', '10:00:00', 4, 1), ('2025-05-11', '11:00:00', 4, 1), ('2025-05-12', '12:00:00', 4, 1);

-- NO initial users, members, employees, member_tee_time, equipment_rental, or manages data inserted here.
-- These will be created via the application signup/admin actions.

SELECT 'Database schema created/reset (NEW Member/Employee STRUCTURE - FOR FIRST ADMIN SIGNUP).' AS Status;