CREATE DATABASE GolfCourseDB;
USE GolfCourseDB;

-- GOLF_COURSE Table
CREATE TABLE GOLF_COURSE (
    Course_id INT PRIMARY KEY AUTO_INCREMENT,
    Course_name VARCHAR(255) NOT NULL,
    Status VARCHAR(50)
);

INSERT INTO GOLF_COURSE (Course_name, Status) VALUES
('Virginia Tech Golf Course', 'Open');

-- HOLE Table
CREATE TABLE HOLE (
    Hole_id INT PRIMARY KEY AUTO_INCREMENT,
    Par INT,
    Distance_to_pin INT
);

INSERT INTO HOLE (Par, Distance_to_pin) VALUES
(4, 372), (4, 370), (3, 188), (5, 528), (4, 351),
(4, 359), (4, 422), (3, 167), (5, 501), (4, 372),
(4, 370), (3, 188), (5, 528), (4, 351), (4, 359),
(4, 422), (3, 167), (5, 501);

-- MEMBERSHIP_PLAN Table
CREATE TABLE MEMBERSHIP_PLAN (
    Plan_id VARCHAR(50) PRIMARY KEY,
    Fees DECIMAL(10, 2),
    Plan_type VARCHAR(50),
    Plan_start_date DATE,
    Plan_end_date DATE
);

INSERT INTO MEMBERSHIP_PLAN (Plan_id, Fees, Plan_type, Plan_start_date, Plan_end_date) VALUES
('VT_STUDENT', 500.00, 'Student', '2025-01-01', '2025-12-31'),
('VT_FACULTY', 750.00, 'Faculty', '2025-01-01', '2025-12-31'),
('VT_ALUMNI', 600.00, 'Alumni', '2025-01-01', '2025-12-31'),
('VT_PUBLIC', 900.00, 'Public', '2025-01-01', '2025-12-31');

-- MEMBER Table
CREATE TABLE MEMBER (
    Member_id INT PRIMARY KEY AUTO_INCREMENT,
    Member_plan_id VARCHAR(50),
    Lname VARCHAR(255),
    Fname VARCHAR(255),
    FOREIGN KEY (Member_plan_id) REFERENCES MEMBERSHIP_PLAN(Plan_id)
);

INSERT INTO MEMBER (Member_plan_id, Lname, Fname) VALUES
('VT_STUDENT', 'Shuban', 'Sridhar'),
('VT_FACULTY', 'Sally', 'Hamouda'),
('VT_ALUMNI', 'Dell', 'Curry'),
('VT_PUBLIC', 'Felix', 'Carlson'),
('VT_STUDENT', 'Lucas', 'Kazem');

-- MEMBER_CONTACT Table
CREATE TABLE MEMBER_CONTACT (
    Contact_id INT PRIMARY KEY AUTO_INCREMENT,
    Member_id INT,
    Email VARCHAR(255),
    Phone_number VARCHAR(20),
    FOREIGN KEY (Member_id) REFERENCES MEMBER(Member_id)
);

INSERT INTO MEMBER_CONTACT (Member_id, Email, Phone_number) VALUES
(1, 'sbuban.sridhar@vt.edu', '540-123-4567'),
(2, 'sallyh84@vt.edu', '540-987-6543'),
(3, 'dell.curry@example.com', '540-111-2222'),
(4, 'felix.carlson@vt.edu', '540-333-4444'),
(5, 'lucaskazem@vt.edu', '540-555-6666');

-- PLAN_DISCOUNT Table
CREATE TABLE PLAN_DISCOUNT (
    Plan_type VARCHAR(50) PRIMARY KEY,
    Rental_discount DECIMAL(5, 2)
);

INSERT INTO PLAN_DISCOUNT (Plan_type, Rental_discount) VALUES
('Student', 0.20),
('Faculty', 0.15),
('Alumni', 0.10),
('Public', 0.05);

-- EQUIPMENT_TYPE Table
CREATE TABLE EQUIPMENT_TYPE (
    Type VARCHAR(50) PRIMARY KEY,
    Rental_fee DECIMAL(10, 2)
);

INSERT INTO EQUIPMENT_TYPE (Type, Rental_fee) VALUES
('Golf Clubs', 30.00),
('Golf Cart', 50.00),
('Push Cart', 15.00),
('Golf Shoes', 10.00),
('Golf Balls', 5.00);

-- EQUIPMENT Table
CREATE TABLE EQUIPMENT (
    Equipment_id INT PRIMARY KEY AUTO_INCREMENT,
    Type VARCHAR(50),
    Availability BOOLEAN,
    FOREIGN KEY (Type) REFERENCES EQUIPMENT_TYPE(Type)
);

INSERT INTO EQUIPMENT (Type, Availability) VALUES
('Golf Clubs', TRUE),
('Golf Cart', TRUE),
('Push Cart', TRUE),
('Golf Shoes', TRUE),
('Golf Balls', TRUE);

-- EMPLOYEE Table
CREATE TABLE EMPLOYEE (
    Emp_id INT PRIMARY KEY AUTO_INCREMENT,
    Emp_Iname VARCHAR(255),
    Emp_fname VARCHAR(255),
    Role VARCHAR(50)
);

INSERT INTO EMPLOYEE (Emp_Iname, Emp_fname, Role) VALUES
('Smith', 'Robert', 'Manager'),
('Johnson', 'Linda', 'Pro Shop Staff'),
('Williams', 'James', 'Groundskeeper'),
('Brown', 'Patricia', 'Instructor'),
('Jones', 'Charles', 'Pro Shop Staff');

-- EMPLOYEE_CONTACT Table
CREATE TABLE EMPLOYEE_CONTACT (
    Contact_id INT PRIMARY KEY AUTO_INCREMENT,
    Emp_id INT,
    Email VARCHAR(255),
    Phone_number VARCHAR(20),
    FOREIGN KEY (Emp_id) REFERENCES EMPLOYEE(Emp_id)
);

INSERT INTO EMPLOYEE_CONTACT (Emp_id, Email, Phone_number) VALUES
(1, 'robert.smith@example.com', '540-123-4567'),
(2, 'linda.johnson@example.com', '540-987-6543'),
(3, 'james.williams@example.com', '540-111-2222'),
(4, 'patricia.brown@example.com', '540-333-4444'),
(5, 'charles.jones@example.com', '540-555-6666');

-- TEE_TIME Table
CREATE TABLE TEE_TIME (
    Tee_time_id INT PRIMARY KEY AUTO_INCREMENT,
    Date DATE,
    Time TIME,
    Status VARCHAR(50),
    Booked_member_id INT,
    Available_slots INT DEFAULT 4,
    Course_id INT,
    FOREIGN KEY (Booked_member_id) REFERENCES MEMBER(Member_id),
    FOREIGN KEY (Course_id) REFERENCES GOLF_COURSE(Course_id)
);

INSERT INTO TEE_TIME (Date, Time, Status, Booked_member_id, Available_slots, Course_id) VALUES
('2023-11-20', '08:00:00', 'Booked', 1, 3, 1),
('2023-11-20', '09:00:00', 'Booked', 2, 3, 1),
('2023-11-21', '10:00:00', 'Booked', 3, 3, 1),
('2023-11-21', '11:00:00', 'Available', NULL, 4, 1),
('2023-11-22', '12:00:00', 'Booked', 4, 3, 1);

-- MEMBER_TEE_TIME Table (many-to-many relationship between MEMBER and TEE_TIME)
CREATE TABLE MEMBER_TEE_TIME (
    Member_id INT,
    Tee_time_id INT,
    PRIMARY KEY (Member_id, Tee_time_id),
    FOREIGN KEY (Member_id) REFERENCES MEMBER(Member_id),
    FOREIGN KEY (Tee_time_id) REFERENCES TEE_TIME(Tee_time_id)
);

-- Initial data for MEMBER_TEE_TIME
INSERT INTO MEMBER_TEE_TIME (Member_id, Tee_time_id) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 5);

-- MANAGES Table
CREATE TABLE MANAGES (
    Emp_id INT,
    Equipment_id INT,
    Management_date DATE,
    PRIMARY KEY (Emp_id, Equipment_id),
    FOREIGN KEY (Emp_id) REFERENCES EMPLOYEE(Emp_id),
    FOREIGN KEY (Equipment_id) REFERENCES EQUIPMENT(Equipment_id)
);

INSERT INTO MANAGES (Emp_id, Equipment_id, Management_date) VALUES
(1, 1, '2025-3-23'),
(2, 2, '2025-3-23'),
(3, 3, '2025-3-24'),
(4, 4, '2025-3-24'),
(5, 5, '2025-3-25');

-- Add these lines at the end of db.sql in VS Code

-- Users table for authentication
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Store hashed passwords, never plain text!
    role ENUM('admin', 'employee', 'member') NOT NULL, -- Define allowed roles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add an index for faster username lookups during login
CREATE INDEX idx_username ON users (username);