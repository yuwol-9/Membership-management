require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Database Connection Test
pool.getConnection()
    .then(connection => {
        console.log('데이터베이스 연결 성공');
        connection.release();
    })
    .catch(err => {
        console.error('데이터베이스 연결 실패:', err);
    });

// Authenticatin Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM admin WHERE username = ?',
            [req.body.username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: '인증 실패' });
        }

        const validPassword = await bcrypt.compare(req.body.password, rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ message: '인증 실패' });
        }

        const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET);
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// Member Registration API
app.post('/api/members', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [memberResult] = await connection.execute(
                'INSERT INTO members (name, gender, age, address) VALUES (?, ?, ?, ?)',
                [req.body.name, req.body.gender, req.body.age, req.body.address]
            );

            const [enrollmentResult] = await connection.execute(
                'INSERT INTO enrollments (member_id, program_id, duration_months, remaining_days, payment_status, start_date) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    memberResult.insertId,
                    req.body.program_id,
                    req.body.duration_months,
                    req.body.duration_months * 30,
                    req.body.payment_status,
                    new Date()
                ]
            );

            await connection.commit();
            res.status(201).json({
                memberId: memberResult.insertId,
                enrollmentId: enrollmentResult.insertId
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// Member List API
app.get('/api/members', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                m.*,
                e.duration_months,
                e.remaining_days,
                e.payment_status,
                p.name as program_name
            FROM members m
            LEFT JOIN enrollments e on m.id = e.member_id
            LEFT JOIN programs p ON e.program_id = p.id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// Member Update API
app.put('/api/members/:id', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.execute(
                'UPDATE members SET name=?, gender=?, age=?, address=? WHERE id=?',
                [req.body.name, req.body.gender, req.body.age, req.body.address, req.params.id]
            );

            if (req.body.enrollment) {
                await connection.execute(
                    'UPDATE enrollments SET program_id=?, duration_months=?, remaining_days=?, payment_status=? WHERE member_id=?',
                    [
                        req.body.enrollment.program_id,
                        req.body.enrollment.duration_months,
                        req.body.enrollment.remaining_days,
                        req.body.enrollment.payment_status,
                        req.params.id
                    ]
                );
            }

            await connection.commit();
            res.json({ message: '수정 완료' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// Attendance Check API
app.post('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.execute(
                'INSERT INTO attendance (enrollment_id, attendance_date) VALUSE (?, ?)',
                [req.body.enrollment_id, new Date()]
            );

            await connection.execute(
                'UPDATE enrollments SET remaining_days = remaining_days - 1 WHERE id = ?',
                [req.body.enrollment_id]
            );

            await connection.commit();
            res.json({ message: '출석 체크 완료' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// Attendance Roll API
app.get('/api/attendance', authenticateToken, async (req, res) => {
    const { month, program_id, instructor_id } = req.query;
    let query = `
        SELECT
            m.name as member_name,
            p.name as program_name,
            i.name as instructor_name,
            a.attendance_date
        FROM attendance a
        JOIN enrollments e ON a.enrollment_id = e.id
        JOIN members m ON e.member_id = m.id
        JOIN programs p ON e.program_id = p.id
        JOIN instructors i ON p.instructor_id = i.id
        WHERE 1=1
    `;
    const params = [];

    if (month) {
        query += " AND MONTH(a.attendance_date) = ?";
        params.push(month);
    }
    if (program_id) {
        query += " AND p.id = ?";
        params.push(program_id);
    }
    if (instructor_id) {
        query += " AND i.id = ?";
        params.push(instructor_id);
    }

    try {
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// Dashboard Statistics API
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const [totalMembers] = await pool.execute('SELECT COUNT(*) as count FROM members');
        const [totalClasses] = await pool.execute('SELECT COUNT(*) as count FROM programs');
        const [todayAttendance] = await pool.execute(
            'SELECT COUNT(*) as count FROM attendance WHERE DATE(attendance_date) = CURDATE()'
        );
        const [monthlyRevenue] = await pool.execute(`
            SELECT SUM(p.price * e.duration_months) as total
            FROM enrollments e
            JOIN programs p ON e.program_id = p.id
            WHERE MONTH(e.start_date) = MONTH(CURRENT_DATE())
            AND e.payment_status = 'paid'
        `);

        res.json({
            totalMembers: totalMembers[0].count,
            totalClasses: totalClasses[0].count,
            todayAttendance: todayAttendance[0].count,
            monthlyRevenue: monthlyRevenue[0].total
        });
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// Monthly Statistics API
app.get('/api/statistics/monthly', authenticateToken, async (req, res) => {
    try {
        const [monthlyStats] = await pool.execute(`
            SELECT
                DATE_FORMAT(e.start_date, '%Y-%m') as month,
                SUM(p.price * e.duration_months) as revenue
            FROM enrollments e
            JOIN programs p ON e.program_id = p.id
            WHERE e.payment_status = 'paid'
            GROUP BY DATE_FORMAT(e.start_date, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12
        `);

        res.json(monthlyStats);
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// Program Statistics API
app.get('/api/statistics/program', authenticateToken, async (req, res) => {
    try {
        const [programStats] = await pool.execute(`
            SELECT
                p.name,
                SUM(p.price * e.duration_months) as revenue,
                COUNT(DISTINCT e.member_id) as total_students
            FROM programs p
            LEFT JOIN enrollments e ON p.id = e.program_id
            WHERE e.payment_status = 'paid'
            GROUP BY p.id
            ORDER BY revenue DESC
        `);

        res.json(programStats);
    } catch (err) {
        res.status(500).json({ message: '서버 오류' });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행중입니다.`);
});