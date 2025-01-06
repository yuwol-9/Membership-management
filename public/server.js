require('dotenv').config();
const express = require('express');
const app = express();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true
}));

app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '홈페이지.html'));
});
app.get('/홈페이지', (req, res) => {
    res.sendFile(path.join(__dirname, '홈페이지.html'));
});
app.get('/로그인', (req, res) => {
    res.sendFile(path.join(__dirname, '로그인.html'));
});
app.get('/회원관리', (req, res) => {
    res.sendFile(path.join(__dirname, '회원관리.html'));
});
app.get('/회원정보등록', (req, res) => {
    res.sendFile(path.join(__dirname, '회원정보등록.html'));
});
app.get('/출석부', (req, res) => {
    res.sendFile(path.join(__dirname, '출석부.html'));
});
app.get('/수업관리', (req, res) => {
    res.sendFile(path.join(__dirname, '수업관리.html'));
});
app.get('/매출_통계페이지', (req, res) => {
    res.sendFile(path.join(__dirname, '매출_통계페이지.html'));
});
app.get('/설정', (req, res) => {
    res.sendFile(path.join(__dirname, '설정.html'));
});
app.get('/선생님', (req, res) => {
    res.sendFile(path.join(__dirname, '선생님.html'));
});

app.use('/image', express.static(path.join(__dirname, 'image')));

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Database Connection Test
pool.getConnection()
    .then(connection => {
        console.log('데이터베이스 연결 성공!');
        connection.release();
    })
    .catch(err => {
        console.error('데이터베이스 연결 실패:', err);
        process.exit(1);
    });

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: '인증이 필요합니다.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await pool.execute(
            'SELECT id, username FROM admin WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
        }

        req.user = users[0];
        next();
    } catch (err) {
        console.error('인증 에러:', err);
        return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
};

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.execute(
            'SELECT * FROM admin WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: '로그인 실패' });
        }

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.PASSWORD);

        if (!validPassword) {
            return res.status(401).json({ message: '로그인 실패' });
        }

        const token = jwt.sign(
            { id: user.ID, username: user.USERNAME },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (err) {
        console.error('로그인 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// Member APIs
app.post('/api/members', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { name, gender, age, birthdate, address, phone, duration_months, payment_status, program_id, start_date } = req.body;

        const [memberResult] = await connection.execute(
            'INSERT INTO members (name, gender, age, birthdate, address, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [name, gender, age, birthdate, address, phone]
        );

        const [enrollmentResult] = await connection.execute(
            'INSERT INTO enrollments (member_id, program_id, duration_months, remaining_days, payment_status, start_date) VALUES (?, ?, ?, ?, ?, ?)',
            [memberResult.insertId, program_id || 1, duration_months, duration_months * 30, payment_status, start_date]
        );

        await connection.commit();

        res.status(201).json({
            message: '회원이 성공적으로 등록되었습니다.',
            memberId: memberResult.insertId,
            enrollmentId: enrollmentResult.insertId
        });
    } catch (err) {
        await connection.rollback();
        console.error('회원 등록 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    } finally {
        connection.release();
    }
});

app.get('/api/members', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                m.*,
                e.duration_months,
                e.remaining_days,
                e.payment_status,
                e.start_date,
                p.name as program_name,
                p.price
            FROM members m
            LEFT JOIN enrollments e ON m.id = e.member_id
            LEFT JOIN programs p ON e.program_id = p.id
            ORDER BY m.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('회원 목록 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

app.put('/api/members/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { name, gender, age, birthdate, address, phone, program_id, duration_months, payment_status, start_date } = req.body;
        const memberId = req.params.id;

        await connection.execute(
            'UPDATE members SET name = ?, gender = ?, age = ?, birthdate = ?, address = ?, phone = ? WHERE id = ?',
            [name, gender, age, birthdate, address, phone, memberId]
        );

        const [existingEnrollment] = await connection.execute(
            'SELECT * FROM enrollments WHERE member_id = ?',
            [memberId]
        );

        if (existingEnrollment.length > 0) {
            await connection.execute(
                'UPDATE enrollments SET program_id = ?, duration_months = ?, payment_status = ? start_date = ? WHERE member_id = ?',
                [program_id, duration_months, payment_status, start_date, memberId]
            );
        } else {
            await connection.execute(
                'INSERT INTO enrollments (member_id, program_id, duration_months, remaining_days, payment_status, start_date) VALUES (?, ?, ?, ?, ?, ?)',
                [memberId, program_id, duration_months, duration_months * 30, payment_status, start_date]
            );
        }

        await connection.commit();
        res.json({ message: '회원 정보가 성공적으로 수정되었습니다.' });
    } catch (err) {
        await connection.rollback();
        console.error('회원 정보 수정 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    } finally {
        connection.release();
    }
});

app.delete('/api/members/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.execute(
            'DELETE a FROM attendance a INNER JOIN enrollments e ON a.enrollment_id = e.id WHERE e.member_id = ?',
            [req.params.id]
        );

        await connection.execute(
            'DELETE FROM enrollments WHERE member_id = ?',
            [req.params.id]
        );

        await connection.execute(
            'DELETE FROM members WHERE id = ?',
            [req.params.id]
        );

        await connection.commit();
        res.json({ message: '회원이 성공적으로 삭제되었습니다.' });
    } catch (err) {
        await connection.rollback();
        console.error('회원 삭제 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    } finally {
        connection.release();
    }
});

// Attendance APIs
app.post('/api/attendance', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { enrollment_id, attendance_date, is_present } = req.body;

        if (!enrollment_id || !attendance_date) {
            await connection.rollback();
            return res.status(400).json({
                message: '필수 입력값이 누락되었습니다.',
                received: { enrollment_id, attendance_date, is_present }
            });
        }

        if (is_present) {
            const [existing] = await connection.execute(
                'SELECT * FROM attendance WHERE enrollment_id = ? AND attendance_date = ?',
                [enrollment_id, attendance_date]
            );

            console.log('Existing attendance check:', existing);

            if (existing.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    message: '이미 출석이 등록되어 있습니다.',
                    details: { enrollment_id, attendance_date }
                });
            }

            await connection.execute(
                'INSERT INTO attendance (enrollment_id, attendance_date) VALUES (?, ?)',
                [enrollment_id, attendance_date]
            );

            await connection.execute(
                'UPDATE enrollments SET remaining_days = remaining_days - 1 WHERE id = ? AND remaining_days > 0',
                [enrollment_id]
            );
        } else {
            const [deleteResult] = await connection.execute(
                'DELETE FROM attendance WHERE enrollment_id = ? AND attendance_date = ?',
                [enrollment_id, attendance_date]
            );

            console.log('Delete result:', deleteResult);

            if (deleteResult.affectedRows > 0) {
                await connection.execute(
                    'UPDATE enrollments SET remaining_days = remaining_days + 1 WHERE id = ?',
                    [enrollment_id]
                );
            }
        }

        await connection.commit();
        
        const response = {
            success: true,
            message: is_present ? '출석이 등록되었습니다.' : '출석이 취소되었습니다.',
            data: { enrollment_id, attendance_date, is_present }
        };
        
        console.log('Sending response:', response);
        res.json(response);
    } catch (err) {
        await connection.rollback();
        console.error('출석 처리 에러:', err);
        res.status(500).json({
            message: '서버 오류가 발생했습니다.',
            error: err.message
        });
    } finally {
        connection.release();
    }
});

app.get('/api/attendance', authenticateToken, async (req, res) => {
    try {
        const { month, year } = req.query;
        const [rows] = await pool.execute(`
            SELECT 
                m.name as member_name,
                e.id as enrollment_id,
                e.remaining_days,
                a.attendance_date,
                p.name as program_name
            FROM members m
            JOIN enrollments e ON m.id = e.member_id
            LEFT JOIN attendance a ON e.id = a.enrollment_id AND MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?
            LEFT JOIN programs p ON e.program_id = p.id
            ORDER BY m.name, a.attendance_date
        `, [month, year]);
        
        res.json(rows);
    } catch (err) {
        console.error('출석 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// Statistics APIs
app.get('/api/statistics/monthly', authenticateToken, async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        console.log('요청된 연도:', year);
        
        const [monthlyStats] = await pool.execute(`
            SELECT 
                DATE_FORMAT(e.start_date, '%Y-%m') as month,
                e.payment_status,
                COUNT(DISTINCT e.id) as enrollment_count,
                COALESCE(SUM(p.price * e.duration_months), 0) as revenue
            FROM enrollments e
            LEFT JOIN programs p ON e.program_id = p.id
            WHERE YEAR(e.start_date) = ?
            GROUP BY DATE_FORMAT(e.start_date, '%Y-%m'), e.payment_status
            ORDER BY month ASC, e.payment_status
        `, [year]);

        console.log('데이터베이스 조회 결과:', monthlyStats);

        const monthlyData = {};
        for (let i = 1; i <= 12; i++) {
            const monthStr = `${year}-${String(i).padStart(2, '0')}`;
            monthlyData[monthStr] = {
                month: monthStr,
                revenue: 0,
                paid_amount: 0,
                unpaid_amount: 0,
                enrollment_count: 0
            };
        }

        monthlyStats.forEach(stat => {
            const revenue = parseFloat(stat.revenue || 0);
            if (monthlyData[stat.month]) {
                if (stat.payment_status === 'paid') {
                    monthlyData[stat.month].paid_amount = revenue;
                } else {
                    monthlyData[stat.month].unpaid_amount = revenue;
                }
                monthlyData[stat.month].revenue = monthlyData[stat.month].paid_amount + monthlyData[stat.month].unpaid_amount;
                monthlyData[stat.month].enrollment_count += parseInt(stat.enrollment_count || 0);
            }
        });

        console.log('최종 처리된 데이터:', Object.values(monthlyData));
        res.json(Object.values(monthlyData));
        
    } catch (err) {
        console.error('월별 통계 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

app.get('/api/statistics/program', authenticateToken, async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        
        const [programStats] = await pool.execute(`
            SELECT 
                p.name,
                p.price,
                COUNT(DISTINCT e.member_id) as total_students,
                COALESCE(SUM(p.price * e.duration_months), 0) as revenue
            FROM programs p
            LEFT JOIN enrollments e ON p.id = e.program_id
            WHERE YEAR(e.start_date) = ?
            GROUP BY p.id, p.name, p.price
            ORDER BY COALESCE(SUM(p.price * e.duration_months), 0) DESC
        `, [year]);

        res.json(programStats);
    } catch (err) {
        console.error('프로그램별 통계 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// Dashboard API
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
        `);

        res.json({
            totalMembers: totalMembers[0].count,
            totalClasses: totalClasses[0].count,
            todayAttendance: todayAttendance[0].count,
            monthlyRevenue: monthlyRevenue[0].total || 0
        });
    } catch (err) {
        console.error('대시보드 데이터 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// Programs APIs
app.get('/api/programs', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, name, price FROM programs ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error('프로그램 목록 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// Error Handlers
app.use((req, res) => {
    res.status(404).send('페이지를 찾을 수 없습니다.');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('서버 에러가 발생했습니다.');
});

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행중입니다.`);
    console.log(`데이터베이스: ${process.env.DB_NAME}`);
    console.log('서버 시작 시간:', new Date().toLocaleString());
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('서버 종료 중...');
    
    // Close database connection
    pool.end((err) => {
        if (err) {
            console.error('데이터베이스 연결 종료 중 에러:', err);
        } else {
            console.log('데이터베이스 연결이 안전하게 종료되었습니다.');
        }
        process.exit(err ? 1 : 0);
    });
});

module.exports = app;