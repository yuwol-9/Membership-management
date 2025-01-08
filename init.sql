CREATE DATABASE IF NOT EXISTS railway DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE railway;

ALTER DATABASE railway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS oohjinDanceAcademy_DB;
/*USE oohjinDanceAcademy_DB;*/

CREATE TABLE IF NOT EXISTS admin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin (username, password) 
VALUES ('woody', '$2b$10$1trTyIfKPPMbiNBpdcKWmOS62NtEzp.Ul4ZeWQXlepX67Uqu8G6Py')
ON DUPLICATE KEY UPDATE password = VALUES(username);

/* instructor table */
CREATE TABLE IF NOT EXISTS instructors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(20)
);

/* member table */
CREATE TABLE IF NOT EXISTS members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    age INT NOT NULL,
    birthdate DATE,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    phone VARCHAR(20) NOT NULL
);

/* program info table */
CREATE TABLE IF NOT EXISTS programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    instructor_id INT,
    monthly_price INT NOT NULL DEFAULT 0,
    per_class_price INT NOT NULL DEFAULT 0,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id)
);

CREATE TABLE IF NOT EXISTS class_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_id INT NOT NULL,
    day VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    details TEXT,
    color VARCHAR(20),
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

/* register info table */
CREATE TABLE IF NOT EXISTS enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    member_id INT NOT NULL,
    program_id INT NOT NULL,
    duration_months INT NOT NULL,
    remaining_days INT NOT NULL,
    payment_status ENUM('paid', 'unpaid') NOT NULL,
    start_date DATE NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (program_id) REFERENCES programs(id)
);

/* attendance table */
CREATE TABLE IF NOT EXISTS attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    enrollment_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
);

/* Insert instructors data */
INSERT INTO instructors (id, name) VALUES
(1, '박현운'),
(2, '임수연'),
(3, '김도연'),
(4, '장태희'),
(5, '선다연'),
(6, '오윤경'),
(7, '고현미'),
(8, '김나은'),
(9, '공민선'),
(10, '최서진'),
(11, '설영우'),
(12, '한채원'),
(13, '최현화'),
(14, '최연서');

/* Modify programs table */
ALTER TABLE programs MODIFY COLUMN instructor_id INT NULL;

/* Insert programs data */
INSERT INTO programs (id, name, price, instructor_id) VALUES
(1, 'FITHOP', 150000, 1),
(2, '다이어트 이지 댄스', 150000, 1),
(3, 'ALL K-POP A', 150000, 2),
(4, 'ALL K-POP B', 150000, 8),
(5, 'ALL K-POP C', 150000, 2),
(6, 'ALL K-POP 토요반', 150000, 3),
(7, '초등 K-POP 토요반', 150000, 3),
(8, '청소년 K-POP 토요반', 150000, 3),
(9, '왁킹 토요반', 150000, 2),
(10, '코레오 토요반', 150000, 4),
(11, '키즈 K-POP', 150000, 5),
(12, '초,중 K-POP', 150000, 2),
(13, '청소년 걸리쉬', 150000, 6),
(14, '왁킹 A', 150000, 2),
(15, '왁킹 B (80분)', 150000, 11),
(16, '힙합 베이직', 150000, 9),
(17, '걸즈힙합 A', 150000, 7),
(18, '걸즈힙합 B', 150000, 10),
(19, '하우스 베이직', 150000, 9),
(20, '소울댄스 (80분)', 150000, 12),
(21, '힙합 & 코레오 (80분)', 150000, 13),
(22, '팝핑 (80분)', 150000, 14),
(23, '코레오 A', 150000, 8),
(24, '코레오 B', 150000, 4),
(25, '청소년 스트릿 (문의)', 150000, NULL);