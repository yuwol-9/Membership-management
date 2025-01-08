const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: envFile });

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
    origin: '*',
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
app.get('/강사관리', (req, res) => {
    res.sendFile(path.join(__dirname, '강사관리.html'));
});

app.use('/image', express.static(path.join(__dirname, 'image')));


// Print all environment variables for debugging
console.log('Available environment variables:', {
    MYSQLHOST: process.env.MYSQLHOST,
    MYSQLUSER: process.env.MYSQLUSER,
    MYSQL_DATABASE: process.env.MYSQL_DATABASE,
    MYSQLPORT: process.env.MYSQLPORT,
    NODE_ENV: process.env.NODE_ENV
});

// Database Configuration
const dbConfig = {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '9999',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'oohjinDanceAcademy_DB',
    port: parseInt(process.env.MYSQLPORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('Using database configuration:', dbConfig);

// Create the connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('데이터베이스 연결 성공!');
        connection.release();
    } catch (err) {
        console.error('데이터베이스 연결 실패:', err);
        console.log('연결 재시도를 시작합니다...');
        setTimeout(testConnection, 10000);
    }
};

// Initial connection test
testConnection();

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
        console.log('로그인 요청 수신:', req.body.username);
        const { username, password } = req.body;
        
        // 디버깅을 위한 로그 추가
        const [rows] = await pool.execute(
            'SELECT * FROM admin WHERE username = ?',
            [username]
        );
        console.log('데이터베이스 조회 결과:', rows);

        if (rows.length === 0) {
            console.log('사용자를 찾을 수 없음');
            return res.status(401).json({ message: '로그인 실패: 사용자를 찾을 수 없습니다.' });
        }

        const user = rows[0];
        console.log('찾은 사용자:', user);
        
        // password 필드명이 대문자인지 소문자인지 확인
        const storedPassword = user.password || user.PASSWORD;
        
        if (!storedPassword) {
            console.log('저장된 비밀번호가 없음');
            return res.status(401).json({ message: '로그인 실패: 비밀번호 오류.' });
        }

        const validPassword = await bcrypt.compare(password, storedPassword);
        console.log('비밀번호 검증 결과:', validPassword);

        if (!validPassword) {
            console.log('잘못된 비밀번호');
            return res.status(401).json({ message: '로그인 실패: 잘못된 비밀번호입니다.' });
        }

        const token = jwt.sign(
            { id: user.ID || user.id, username: user.USERNAME || user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('로그인 성공, 토큰 생성');
        res.json({
            success: true,
            token,
            user: {
                id: user.ID || user.id,
                username: user.USERNAME || user.username
            }
        });
    } catch (err) {
        console.error('로그인 처리 중 상세 오류:', err);
        res.status(500).json({ 
            message: '서버 오류', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
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
        console.log('회원 목록 조회 API 호출됨');
        const [rows] = await pool.execute(`
            SELECT 
                m.id,
                m.name,
                m.gender,
                m.age,
                m.birthdate,
                m.address,
                m.phone,
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
        
        console.log('조회된 회원 데이터:', rows);
        res.json(rows);
    } catch (err) {
        console.error('회원 목록 조회 상세 에러:', err);
        res.status(500).json({ 
            message: '서버 오류', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
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

// 회원 개별 조회
app.get('/api/members/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                m.*,
                e.program_id,
                e.duration_months,
                e.remaining_days,
                e.payment_status,
                e.start_date,
                p.name as program_name
            FROM members m
            LEFT JOIN enrollments e ON m.id = e.member_id
            LEFT JOIN programs p ON e.program_id = p.id
            WHERE m.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('회원 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
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

// Instructor APIs
// 강사 목록 조회
app.get('/api/instructors', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, phone, salary FROM instructors ORDER BY name'
        );
        res.json(rows);
    } catch (err) {
        console.error('강사 목록 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 강사 등록
app.post('/api/instructors', authenticateToken, async (req, res) => {
    try {
        const { name, phone, salary } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO instructors (name, phone, salary) VALUES (?, ?, ?)',
            [name, phone, salary]
        );
        res.status(201).json({
            message: '강사가 성공적으로 등록되었습니다.',
            id: result.insertId
        });
    } catch (err) {
        console.error('강사 등록 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 강사 정보 수정
app.put('/api/instructors/:id', authenticateToken, async (req, res) => {
    try {
        const { name, phone, salary } = req.body;
        const { id } = req.params;
        await pool.execute(
            'UPDATE instructors SET name = ?, phone = ?, salary = ? WHERE id = ?',
            [name, phone, salary, id]
        );
        res.json({ message: '강사 정보가 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('강사 정보 수정 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 강사 삭제
app.delete('/api/instructors/:id', authenticateToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM instructors WHERE id = ?', [req.params.id]);
        res.json({ message: '강사가 성공적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('강사 삭제 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 강사 개별 조회
app.get('/api/instructors/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, phone, salary FROM instructors WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: '강사를 찾을 수 없습니다.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('강사 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});


// Programs APIs
app.post('/api/programs', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { 
            name, 
            instructor_name, 
            monthly_price, 
            per_class_price,
            day,
            startTime,
            endTime,
            details,
            color 
        } = req.body;

        // 먼저 강사 정보 확인 또는 추가
        let [instructor] = await connection.execute(
            'SELECT id FROM instructors WHERE name = ?',
            [instructor_name]
        );

        let instructor_id;
        if (instructor.length === 0) {
            const [result] = await connection.execute(
                'INSERT INTO instructors (name) VALUES (?)',
                [instructor_name]
            );
            instructor_id = result.insertId;
        } else {
            instructor_id = instructor[0].id;
        }

        // 프로그램 추가
        const [program] = await connection.execute(
            'INSERT INTO programs (name, instructor_id, monthly_price, per_class_price) VALUES (?, ?, ?, ?)',
            [name, instructor_id, monthly_price || 0, per_class_price || 0]
        );

        // 수업 시간 정보 추가
        if (day && startTime && endTime) {
            await connection.execute(
                'INSERT INTO class_schedules (program_id, day, start_time, end_time, details, color) VALUES (?, ?, ?, ?, ?, ?)',
                [program.insertId, day, startTime, endTime, details, color]
            );
        }

        await connection.commit();
        res.status(201).json({
            id: program.insertId,
            message: '프로그램이 성공적으로 등록되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('프로그램 등록 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    } finally {
        connection.release();
    }
});

app.get('/api/programs', authenticateToken, async (req, res) => {
    try {
        const [programs] = await pool.execute(`
            SELECT 
                p.id,
                p.name,
                p.monthly_price,
                p.per_class_price,
                i.name as instructor_name,
                cs.day,
                cs.start_time,
                cs.end_time,
                cs.details,
                cs.color
            FROM programs p
            LEFT JOIN instructors i ON p.instructor_id = i.id
            LEFT JOIN class_schedules cs ON p.id = cs.program_id
            ORDER BY p.name
        `);

        // 결과를 프로그램별로 그룹화
        const groupedPrograms = programs.reduce((acc, curr) => {
            if (!acc[curr.id]) {
                acc[curr.id] = {
                    id: curr.id,
                    name: curr.name,
                    instructor_name: curr.instructor_name,
                    monthly_price: curr.monthly_price,
                    per_class_price: curr.per_class_price,
                    classes: []
                };
            }
            
            if (curr.day) {
                acc[curr.id].classes.push({
                    day: curr.day,
                    startTime: curr.start_time,
                    endTime: curr.end_time,
                    details: curr.details,
                    color: curr.color
                });
            }
            
            return acc;
        }, {});

        res.json(Object.values(groupedPrograms));
    } catch (err) {
        console.error('프로그램 목록 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 프로그램 수정 API
app.put('/api/programs/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { 
            name, 
            instructor_name, 
            monthly_price, 
            per_class_price,
            classes 
        } = req.body;

        // 강사 정보 확인 또는 추가
        let [instructor] = await connection.execute(
            'SELECT id FROM instructors WHERE name = ?',
            [instructor_name]
        );

        let instructor_id;
        if (instructor.length === 0) {
            const [result] = await connection.execute(
                'INSERT INTO instructors (name) VALUES (?)',
                [instructor_name]
            );
            instructor_id = result.insertId;
        } else {
            instructor_id = instructor[0].id;
        }

        // 프로그램 정보 업데이트
        await connection.execute(
            'UPDATE programs SET name = ?, instructor_id = ?, monthly_price = ?, per_class_price = ? WHERE id = ?',
            [name, instructor_id, monthly_price, per_class_price, id]
        );

        // 기존 수업 스케줄 삭제
        await connection.execute('DELETE FROM class_schedules WHERE program_id = ?', [id]);

        // 새로운 수업 스케줄 추가
        if (classes && classes.length > 0) {
            const insertSchedule = connection.prepare(
                'INSERT INTO class_schedules (program_id, day, start_time, end_time, details, color) VALUES (?, ?, ?, ?, ?, ?)'
            );

            for (const classInfo of classes) {
                await insertSchedule.execute([
                    id,
                    classInfo.day,
                    classInfo.startTime,
                    classInfo.endTime,
                    classInfo.details,
                    classInfo.color
                ]);
            }
        }

        await connection.commit();
        res.json({ message: '프로그램이 성공적으로 수정되었습니다.' });
    } catch (err) {
        await connection.rollback();
        console.error('프로그램 수정 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    } finally {
        connection.release();
    }
});

// 프로그램 삭제 API
app.delete('/api/programs/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // 연결된 수업 스케줄 먼저 삭제
        await connection.execute('DELETE FROM class_schedules WHERE program_id = ?', [id]);
        
        // 프로그램 삭제
        await connection.execute('DELETE FROM programs WHERE id = ?', [id]);
        
        await connection.commit();
        res.json({ message: '프로그램이 성공적으로 삭제되었습니다.' });
    } catch (err) {
        await connection.rollback();
        console.error('프로그램 삭제 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    } finally {
        connection.release();
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
app.listen(PORT, '0.0.0.0', () => {
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