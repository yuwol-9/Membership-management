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
app.use(express.static(path.join(__dirname)));

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
app.get('/선생님관리', (req, res) => {
    res.sendFile(path.join(__dirname, '선생님관리.html'));
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

        const { 
            name, gender, age, birthdate, address, phone, 
            program_id, start_date, payment_status,
            duration_months, total_classes 
        } = req.body;

        // 회원 기본 정보 저장
        const [memberResult] = await connection.execute(
            'INSERT INTO members (name, gender, age, birthdate, address, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [name, gender, age, birthdate, address, phone]
        );

        // 수업 정보 조회
        const [programs] = await connection.execute(
            'SELECT monthly_price, per_class_price, classes_per_week FROM programs WHERE id = ?',
            [program_id]
        );

        if (programs.length === 0) {
            throw new Error('수업 정보를 찾을 수 없습니다.');
        }

        const program = programs[0];

        // 수강 금액과 남은 일수 계산
        let totalAmount = 0;
        let remainingDays = 0;

        if (duration_months > 0) {
            totalAmount = duration_months * program.monthly_price;
            const classesPerMonth = program.classes_per_week * 4;
            remainingDays = duration_months * classesPerMonth;
        } else if (total_classes > 0) {
            totalAmount = total_classes * program.per_class_price;
            remainingDays = total_classes;
        }

        const [enrollmentResult] = await connection.execute(
            'INSERT INTO enrollments (member_id, program_id, duration_months, total_classes, remaining_days, payment_status, start_date, total_amount, original_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                memberResult.insertId, 
                program_id, 
                duration_months || null, 
                total_classes || null, 
                remainingDays, 
                payment_status, 
                start_date, 
                totalAmount,
                totalAmount
            ]
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
        res.status(500).json({ message: err.message || '서버 오류' });
    } finally {
        connection.release();
    }
});

app.get('/api/members', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                m.id,
                m.name,
                m.gender,
                m.age,
                m.birthdate,
                m.address,
                m.phone,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', e.id,
                        'name', p.name,
                        'duration_months', e.duration_months,
                        'total_classes', e.total_classes,
                        'remaining_days', e.remaining_days,
                        'payment_status', e.payment_status,
                        'start_date', e.start_date,
                        'total_amount', e.total_amount,
                        'original_amount', e.original_amount,
                        'monthly_price', p.monthly_price,
                        'per_class_price', p.per_class_price
                    )
                ) as programs
            FROM members m
            LEFT JOIN enrollments e ON m.id = e.member_id
            LEFT JOIN programs p ON e.program_id = p.id
            GROUP BY m.id
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

        const memberId = req.params.id;
        const { 
            name, gender, age, birthdate, address, phone,
            program_id, duration_months, total_classes,
            payment_status, start_date
        } = req.body;

        // 수업 정보 조회
        const [programs] = await connection.execute(
            'SELECT monthly_price, per_class_price, classes_per_week FROM programs WHERE id = ?',
            [program_id]
        );

        if (programs.length === 0) {
            throw new Error('수업 정보를 찾을 수 없습니다.');
        }

        const program = programs[0];

        const [currentEnrollment] = await connection.execute(
            'SELECT duration_months, total_classes, remaining_days FROM enrollments WHERE member_id = ?',
            [memberId]
        );

        // 새로운 구독의 총 금액과 남은 일수 계산
        let totalAmount = 0;
        let newRemainingDays = 0;

        if (duration_months > 0) {
            totalAmount = duration_months * program.monthly_price;
            const classesPerMonth = program.classes_per_week * 4;
            const newTotalClasses = duration_months * classesPerMonth;
        
            if (currentEnrollment[0].total_classes && newTotalClasses < currentEnrollment[0].total_classes) {
                throw new Error('기존 등록된 횟수보다 적게 수정할 수 없습니다.');
            }
        
            const additionalClasses = newTotalClasses - currentEnrollment[0].total_classes;
            newRemainingDays = currentEnrollment[0].remaining_days + additionalClasses;
        } else if (total_classes > 0) {
            totalAmount = total_classes * program.per_class_price;
        
            if (currentEnrollment[0].total_classes && total_classes < currentEnrollment[0].total_classes) {
                throw new Error('기존 등록된 횟수보다 적게 수정할 수 없습니다.');
            }
        
            const additionalClasses = total_classes - currentEnrollment[0].total_classes;
            newRemainingDays = currentEnrollment[0].remaining_days + additionalClasses;
        }

        // 회원 기본 정보 업데이트
        await connection.execute(
            'UPDATE members SET name = ?, gender = ?, age = ?, birthdate = ?, address = ?, phone = ? WHERE id = ?',
            [name, gender, age, birthdate, address, phone, memberId]
        );

        // 수강 정보 업데이트
        await connection.execute(
            `UPDATE enrollments 
            SET program_id = ?, 
                duration_months = ?,
                total_classes = ?,
                remaining_days = ?,
                payment_status = ?,
                start_date = ?,
                total_amount = ?
            WHERE member_id = ?`,
            [
                program_id,
                duration_months || null,
                total_classes || null,
                newRemainingDays,
                payment_status,
                start_date,
                totalAmount,
                memberId
            ]
        );

        await connection.commit();
        res.json({ 
            success: true,
            message: '회원 정보가 성공적으로 수정되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('회원 정보 수정 중 오류:', err);
        res.status(400).json({ 
            success: false,
            message: err.message || '회원 정보 수정 중 오류가 발생했습니다.'
        });
    } finally {
        connection.release();
    }
});

app.delete('/api/members/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const memberId = req.params.id;
        
        const [memberExists] = await connection.execute(
            'SELECT id FROM members WHERE id = ?',
            [memberId]
        );

        if (memberExists.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });
        }

        await connection.execute(`
            DELETE a FROM attendance a
            INNER JOIN enrollments e ON a.enrollment_id = e.id
            WHERE e.member_id = ?
        `, [memberId]);

        await connection.execute(
            'DELETE FROM enrollments WHERE member_id = ?',
            [memberId]
        );

        await connection.execute(
            'DELETE FROM members WHERE id = ?',
            [memberId]
        );

        await connection.commit();
        res.json({ 
            success: true,
            message: '회원이 성공적으로 삭제되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('회원 삭제 중 오류 발생:', err);
        res.status(500).json({ 
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: process.env.NODE_ENV === 'development' ? err.message : '내부 서버 오류'
        });
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
                e.total_classes,
                e.remaining_days,
                e.payment_status,
                e.start_date,
                p.name as program_name,
                p.monthly_price,
                p.per_class_price,
                e.total_amount
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

app.post('/api/members/enrollment/:id/programs', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const enrollmentId = req.params.id;
        console.log('Request body:', req.body);  // 요청 데이터 확인
        console.log('is_extension value:', req.body.is_extension);  // is_extension 값 확인
        
        const [enrollment] = await connection.execute(
            'SELECT e.member_id, e.remaining_days, e.total_amount, e.original_amount, e.program_id, p.classes_per_week ' +
            'FROM enrollments e ' +
            'JOIN programs p ON e.program_id = p.id ' +
            'WHERE e.id = ?',
            [enrollmentId]
        );

        if (enrollment.length === 0) {
            throw new Error('등록 정보를 찾을 수 없습니다.');
        }

        const memberId = enrollment[0].member_id;
        const currentRemainingDays = enrollment[0].remaining_days || 0;
        const currentTotalAmount = enrollment[0].total_amount || 0;
        
        const { 
            program_id, 
            start_date, 
            payment_status,
            duration_months,
            total_classes,
            is_extension
        } = req.body;

        console.log('Logic path:', is_extension ? '연장 로직' : '신규 추가 로직');  // 어떤 로직이 실행되는지 확인

        if (!is_extension) {
            const [existingEnrollment] = await connection.execute(
                'SELECT id FROM enrollments WHERE member_id = ? AND program_id = ?',
                [memberId, program_id]
            );

            if (existingEnrollment.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: '이미 추가된 수업입니다. 수정/연장을 이용해주세요.'
                });
            }
        }

        const [programs] = await connection.execute(
            'SELECT monthly_price, per_class_price, classes_per_week FROM programs WHERE id = ?',
            [program_id]
        );

        if (programs.length === 0) {
            throw new Error('프로그램 정보를 찾을 수 없습니다.');
        }

        const program = programs[0];

        let newTotalClasses;
        let newAmount;

        if (duration_months > 0) {
            const classesPerMonth = program.classes_per_week * 4;
            newTotalClasses = duration_months * classesPerMonth;
            newAmount = duration_months * program.monthly_price;
        } else {
            newTotalClasses = total_classes;
            newAmount = total_classes * program.per_class_price;
        }

        console.log('Calculated amount:', newAmount);  // 계산된 금액 확인
        console.log('Current state:', {
            currentRemainingDays,
            currentTotalAmount,
            newAmount,
            newTotalClasses
        });

        if (is_extension) {
            console.log('Executing extension update...');  // 연장 업데이트 실행 확인
            const finalTotalAmount = currentTotalAmount + newAmount;
            const finalRemainingDays = currentRemainingDays + newTotalClasses;
            
            console.log('Extension values:', {
                finalRemainingDays,
                finalTotalAmount
            });

            await connection.execute(
                `UPDATE enrollments 
                SET remaining_days = ?,
                    total_amount = ?
                WHERE id = ?`,
                [
                    finalRemainingDays,
                    finalTotalAmount,
                    enrollmentId
                ]
            );
        } else {
            console.log('Executing new enrollment insert...');  // 신규 등록 실행 확인
            await connection.execute(
                'INSERT INTO enrollments (member_id, program_id, duration_months, total_classes, remaining_days, payment_status, start_date, total_amount, original_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    memberId,
                    program_id,
                    duration_months || null,
                    total_classes || null,
                    newTotalClasses,
                    payment_status,
                    start_date,
                    newAmount,
                    newAmount
                ]
            );
        }

        await connection.commit();
        res.json({ 
            success: true,
            message: is_extension ? '프로그램이 성공적으로 연장되었습니다.' : '프로그램이 성공적으로 추가되었습니다.',
            redirect: '/회원관리.html'
        });
    } catch (err) {
        await connection.rollback();
        console.error('프로그램 추가/연장 중 오류:', err);
        res.status(500).json({ 
            success: false,
            message: err.message || '서버 오류가 발생했습니다.'
        });
    } finally {
        connection.release();
    }
});
app.get('/api/members/enrollment/:id', authenticateToken, async (req, res) => {
    try {
        const enrollmentId = req.params.id;
        
        const [rows] = await pool.execute(`
            SELECT 
                m.*,
                e.id as enrollment_id,
                e.program_id,
                e.duration_months,
                e.total_classes,
                e.remaining_days,
                e.payment_status,
                e.start_date,
                p.name as program_name,
                p.monthly_price,
                p.per_class_price,
                e.total_amount
            FROM members m
            JOIN enrollments e ON m.id = e.member_id
            LEFT JOIN programs p ON e.program_id = p.id
            WHERE e.id = ?
        `, [enrollmentId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: '회원 정보를 찾을 수 없습니다.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('회원 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

app.put('/api/members/enrollment/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const enrollmentId = req.params.id;
        const { 
            name, gender, age, birthdate, address, phone,
            program_id, duration_months, total_classes,
            payment_status, start_date,
            is_extension
        } = req.body;

        // enrollment로 현재 정보 찾기
        const [enrollment] = await connection.execute(
            'SELECT e.member_id, e.duration_months, e.total_classes, ' +
            'e.remaining_days, e.total_amount, ' +
            'p.classes_per_week ' +
            'FROM enrollments e ' +
            'JOIN programs p ON e.program_id = p.id ' +
            'WHERE e.id = ?',
            [enrollmentId]
        );

        if (enrollment.length === 0) {
            throw new Error('등록 정보를 찾을 수 없습니다.');
        }

        const memberId = enrollment[0].member_id;
        const currentRemainingDays = enrollment[0].remaining_days || 0;
        const currentTotalAmount = enrollment[0].total_amount || 0;

        // 프로그램 정보 조회
        const [programs] = await connection.execute(
            'SELECT monthly_price, per_class_price, classes_per_week FROM programs WHERE id = ?',
            [program_id]
        );

        if (programs.length === 0) {
            throw new Error('프로그램 정보를 찾을 수 없습니다.');
        }

        const program = programs[0];

        // 새로운 총 수업 횟수와 금액 계산
        let newTotalClasses;
        let finalDurationMonths = null;
        let finalTotalClasses = null;
        let newTotalAmount;

        if (duration_months > 0) {
            newTotalClasses = duration_months * program.classes_per_week * 4;
            finalDurationMonths = duration_months;
            newTotalAmount = duration_months * program.monthly_price;
        } else {
            newTotalClasses = total_classes;
            finalTotalClasses = total_classes;
            newTotalAmount = total_classes * program.per_class_price;
        }

        if (is_extension) {
            newTotalAmount += currentTotalAmount;
            const newRemainingDays = currentRemainingDays + newTotalClasses;
            
            await connection.execute(
                `UPDATE enrollments 
                SET remaining_days = ?,
                    total_amount = ?
                WHERE id = ?`,
                [
                    newRemainingDays,
                    newTotalAmount,
                    enrollmentId
                ]
            );
        } else {
            // 회원 기본 정보 업데이트
            await connection.execute(
                'UPDATE members SET name = ?, gender = ?, age = ?, birthdate = ?, address = ?, phone = ? WHERE id = ?',
                [name, gender, age, birthdate, address, phone, memberId]
            );

            // 수강 정보 업데이트
            await connection.execute(
                `UPDATE enrollments 
                SET program_id = ?, 
                    duration_months = ?,
                    total_classes = ?,
                    remaining_days = ?,
                    payment_status = ?,
                    start_date = ?,
                    total_amount = ?
                WHERE id = ?`,
                [
                    program_id,
                    finalDurationMonths,
                    finalTotalClasses,
                    newTotalClasses,
                    payment_status,
                    start_date,
                    newTotalAmount,
                    enrollmentId
                ]
            );
        }

        await connection.commit();
        res.json({ 
            success: true,
            message: is_extension ? '수업이 성공적으로 연장되었습니다.' : '회원 정보가 성공적으로 수정되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('회원 정보 수정/연장 중 오류:', err);
        res.status(400).json({ 
            success: false,
            message: err.message || '회원 정보 수정/연장 중 오류가 발생했습니다.'
        });
    } finally {
        connection.release();
    }
});

app.delete('/api/enrollments/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const enrollmentId = req.params.id;

        const [enrollments] = await connection.execute(`
            SELECT COUNT(*) as total_enrollments 
            FROM enrollments e1
            JOIN enrollments e2 ON e1.member_id = e2.member_id
            WHERE e1.id = ?
        `, [enrollmentId]);

        if (enrollments[0].total_enrollments <= 1) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false,
                message: '마지막 수업은 삭제할 수 없습니다. 회원을 삭제하시려면 회원 삭제 기능을 이용해주세요.'
            });
        }
        
        // 해당 수업의 출석 기록 삭제
        await connection.execute(
            'DELETE FROM attendance WHERE enrollment_id = ?',
            [enrollmentId]
        );

        // 수강 정보 삭제
        await connection.execute(
            'DELETE FROM enrollments WHERE id = ?',
            [enrollmentId]
        );

        await connection.commit();
        res.json({ 
            success: true,
            message: '수업이 성공적으로 삭제되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('수업 삭제 중 오류 발생:', err);
        res.status(500).json({ 
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: process.env.NODE_ENV === 'development' ? err.message : '내부 서버 오류'
        });
    } finally {
        connection.release();
    }
});

app.delete('/api/members/enrollment/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const enrollmentId = req.params.id;
        
        const [enrollment] = await connection.execute(
            'SELECT member_id FROM enrollments WHERE id = ?',
            [enrollmentId]
        );

        if (enrollment.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '수강 정보를 찾을 수 없습니다.' });
        }

        const memberId = enrollment[0].member_id;

        // 해당 회원의 모든 출석 기록 삭제
        await connection.execute(`
            DELETE a FROM attendance a
            INNER JOIN enrollments e ON a.enrollment_id = e.id
            WHERE e.member_id = ?
        `, [memberId]);

        // 모든 수강 정보 삭제
        await connection.execute(
            'DELETE FROM enrollments WHERE member_id = ?',
            [memberId]
        );

        // 회원 정보 삭제
        await connection.execute(
            'DELETE FROM members WHERE id = ?',
            [memberId]
        );

        await connection.commit();
        res.json({ 
            success: true,
            message: '회원이 성공적으로 삭제되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('회원 삭제 중 오류 발생:', err);
        res.status(500).json({ 
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: process.env.NODE_ENV === 'development' ? err.message : '내부 서버 오류'
        });
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

        // 입력값 검증 및 로깅
        console.log('Received attendance data:', {
            enrollment_id,
            attendance_date,
            is_present
        });

        // enrollment_id가 유효한지 확인
        const [enrollment] = await connection.execute(
            'SELECT id, remaining_days FROM enrollments WHERE id = ?',
            [enrollment_id]
        );

        if (enrollment.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                message: '유효하지 않은 수강 정보입니다.',
                received: { enrollment_id }
            });
        }

        if (is_present) {
            // 이미 출석한 기록이 있는지 확인
            const [existing] = await connection.execute(
                'SELECT * FROM attendance WHERE enrollment_id = ? AND DATE(attendance_date) = DATE(?)',
                [enrollment_id, attendance_date]
            );

            if (existing.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    message: '이미 출석 처리된 기록입니다.',
                    details: { enrollment_id, attendance_date }
                });
            }

            // 출석 기록 추가
            await connection.execute(
                'INSERT INTO attendance (enrollment_id, attendance_date) VALUES (?, ?)',
                [enrollment_id, attendance_date]
            );

            // 남은 일수 감소
            await connection.execute(
                'UPDATE enrollments SET remaining_days = remaining_days - 1 WHERE id = ? AND remaining_days > 0',
                [enrollment_id]
            );
        } else {
            // 출석 취소 처리
            const [deleteResult] = await connection.execute(
                'DELETE FROM attendance WHERE enrollment_id = ? AND DATE(attendance_date) = DATE(?)',
                [enrollment_id, attendance_date]
            );

            if (deleteResult.affectedRows > 0) {
                // 남은 일수 증가
                await connection.execute(
                    'UPDATE enrollments SET remaining_days = remaining_days + 1 WHERE id = ?',
                    [enrollment_id]
                );
            }
        }

        await connection.commit();
        res.json({
            success: true,
            message: is_present ? '출석이 처리되었습니다.' : '출석이 취소되었습니다.',
            data: { enrollment_id, attendance_date, is_present }
        });
    } catch (err) {
        await connection.rollback();
        console.error('출석 처리 중 오류:', err);
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
        const { month, year, program_id } = req.query;
        
        const [rows] = await pool.execute(`
            SELECT 
                m.name as member_name,
                e.id as enrollment_id,
                e.remaining_days,
                GROUP_CONCAT(a.attendance_date) as attendance_dates,
                p.name as program_name,
                p.id as program_id
            FROM members m
            JOIN enrollments e ON m.id = e.member_id
            JOIN programs p ON e.program_id = p.id
            LEFT JOIN attendance a ON e.id = a.enrollment_id
            WHERE (? IS NULL OR p.id = ?)
            GROUP BY m.name, e.id, e.remaining_days, p.name, p.id
            ORDER BY m.name
        `, [program_id, program_id]);

        // 출석 날짜 데이터 처리
        const processedData = rows.map(row => ({
            ...row,
            attendance_dates: row.attendance_dates ? row.attendance_dates.split(',') : [],
            dates: row.attendance_dates ? row.attendance_dates.split(',') : []
        }));

        res.json(processedData);
    } catch (err) {
        console.error('출석 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// Statistics APIs
app.get('/api/statistics/monthly', authenticateToken, async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        
        const [monthlyStats] = await pool.execute(`
            SELECT 
                DATE_FORMAT(e.start_date, '%Y-%m') as month,
                e.payment_status,
                COUNT(DISTINCT e.id) as enrollment_count,
                COALESCE(SUM(e.total_amount), 0) as revenue
            FROM enrollments e
            WHERE YEAR(e.start_date) = ?
            GROUP BY DATE_FORMAT(e.start_date, '%Y-%m'), e.payment_status
            ORDER BY month ASC, e.payment_status
        `, [year]);

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
                COUNT(DISTINCT e.member_id) as total_students,
                COALESCE(SUM(e.total_amount), 0) as revenue
            FROM programs p
            LEFT JOIN enrollments e ON p.id = e.program_id AND YEAR(e.start_date) = ?
            GROUP BY p.id, p.name
            ORDER BY revenue DESC
        `, [year]);

        res.json(programStats);
    } catch (err) {
        console.error('수업별 통계 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// Dashboard API
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDate = new Date();
        const currentDay = dayNames[currentDate.getDay()];

        const [totalMembers] = await pool.execute('SELECT COUNT(*) as count FROM members');
        const [totalClasses] = await pool.execute('SELECT COUNT(*) as count FROM programs');
        const [monthlyRevenue] = await pool.execute(`
            SELECT SUM(total_amount) as total 
            FROM enrollments 
            WHERE MONTH(start_date) = MONTH(CURRENT_DATE())
            AND YEAR(start_date) = YEAR(CURRENT_DATE())`
        );

        const [todayClasses] = await pool.execute(`
            SELECT name 
            FROM (
                SELECT DISTINCT p.name, cs.start_time
                FROM programs p 
                JOIN class_schedules cs ON p.id = cs.program_id 
                WHERE cs.day = ?
                ORDER BY cs.start_time ASC
            ) as ordered_classes
        `, [currentDay]);

        const todayClassName = todayClasses.length > 0 
            ? todayClasses.map(cls => cls.name).join(', ')
            : "수업이 없습니다";

        res.json({
            totalMembers: totalMembers[0].count,
            totalClasses: totalClasses[0].count,
            monthlyRevenue: monthlyRevenue[0].total || 0,
            todayClassName: todayClassName
        });
    } catch (err) {
        console.error('대시보드 데이터 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// Instructor APIs
// 선생님 목록 조회
app.get('/api/instructors', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, phone, salary FROM instructors ORDER BY name'
        );
        res.json(rows);
    } catch (err) {
        console.error('선생님 목록 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 선생님 등록
app.post('/api/instructors', authenticateToken, async (req, res) => {
    try {
        const { name, phone, salary } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO instructors (name, phone, salary) VALUES (?, ?, ?)',
            [name, phone, salary]
        );
        res.status(201).json({
            message: '선생님이 성공적으로 등록되었습니다.',
            id: result.insertId
        });
    } catch (err) {
        console.error('선생님 등록 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 선생님 정보 수정
app.put('/api/instructors/:id', authenticateToken, async (req, res) => {
    try {
        const { name, phone, salary } = req.body;
        const { id } = req.params;
        await pool.execute(
            'UPDATE instructors SET name = ?, phone = ?, salary = ? WHERE id = ?',
            [name, phone, salary, id]
        );
        res.json({ message: '선생님 정보가 성공적으로 수정되었습니다.' });
    } catch (err) {
        console.error('선생님 정보 수정 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 선생님 삭제
app.delete('/api/instructors/:id', authenticateToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM instructors WHERE id = ?', [req.params.id]);
        res.json({ message: '선생님이 성공적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('선생님 삭제 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 선생님 개별 조회
app.get('/api/instructors/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, phone, salary FROM instructors WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: '선생님을 찾을 수 없습니다.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('선생님 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});


// Programs APIs
app.post('/api/programs', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        console.log('받은 수업 데이터:', req.body);

        const { 
            name, 
            instructor_name, 
            monthly_price, 
            per_class_price,
            classes_per_week,
            schedules,
            details,
            color 
        } = req.body;

        const classesPerWeek = parseInt(classes_per_week);
        if (isNaN(classesPerWeek) || classesPerWeek < 1) {
            throw new Error(`주간 수업 횟수가 올바르지 않습니다: ${classes_per_week}`);
        }

        let instructor_id = null;
        if (instructor_name && instructor_name.trim()) {
            const [instructor] = await connection.execute(
                'SELECT id FROM instructors WHERE name = ?',
                [instructor_name.trim()]
            );

            if (instructor.length === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: '등록되지 않은 선생님입니다.',
                    errorType: 'INSTRUCTOR_NOT_FOUND'
                });
            }
            instructor_id = instructor[0].id;
        }

        const [program] = await connection.execute(
            'INSERT INTO programs (name, instructor_id, monthly_price, per_class_price, classes_per_week) VALUES (?, ?, ?, ?, ?)',
            [name, instructor_id, monthly_price || 0, per_class_price || 0, classes_per_week || 1]
        );

        console.log('생성된 수업:', program);

        if (!schedules || !Array.isArray(schedules) || schedules.length !== classes_per_week) {
            throw new Error('스케줄 데이터가 유효하지 않습니다.');
        }

        for (const schedule of schedules) {
            console.log('스케줄 추가:', schedule);
            await connection.execute(
                'INSERT INTO class_schedules (program_id, day, start_time, end_time, details, color) VALUES (?, ?, ?, ?, ?, ?)',
                [program.insertId, schedule.day, schedule.startTime, schedule.endTime, details || null, color]
            );
        }

        await connection.commit();
        res.status(201).json({
            id: program.insertId,
            message: '수업이 성공적으로 등록되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('수업 등록 에러:', err);
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

        // 결과를 수업별로 그룹화
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
        console.error('수업 목록 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

app.delete('/api/programs', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [enrollments] = await connection.execute(
            'SELECT COUNT(*) as count FROM enrollments e ' +
            'INNER JOIN members m ON e.member_id = m.id'
        );

        if (enrollments[0].count > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '수업을 등록한 회원이 있어 초기화할 수 없습니다.'
            });
        }
        
        // 수업 관련 모든 데이터 삭제
        await connection.execute('DELETE FROM class_schedules');
        await connection.execute('DELETE FROM enrollments');
        await connection.execute('DELETE FROM programs');
        
        await connection.commit();
        res.json({
            success: true,
            message: '모든 수업이 성공적으로 삭제되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('수업 전체 삭제 중 오류:', err);
        res.status(500).json({
            success: false,
            message: '수업 삭제 중 오류가 발생했습니다.'
        });
    } finally {
        connection.release();
    }
});

// 수업 개별 조회 API
app.get('/api/programs/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                p.id,
                p.name,
                p.monthly_price,
                p.per_class_price,
                i.name as instructor_name,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'day', cs.day,
                        'startTime', cs.start_time,
                        'endTime', cs.end_time,
                        'details', cs.details,
                        'color', cs.color
                    )
                ) as classes
            FROM programs p
            LEFT JOIN instructors i ON p.instructor_id = i.id
            LEFT JOIN class_schedules cs ON p.id = cs.program_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [req.params.id]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: '수업을 찾을 수 없습니다.' });
        }

        const program = rows[0];
        program.classes = program.classes ? JSON.parse(`[${program.classes}]`) : [];

        res.json(program);
    } catch (err) {
        console.error('수업 조회 에러:', err);
        res.status(500).json({ message: '서버 오류' });
    }
});

function convertTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

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
            schedules,
        } = req.body;

        // 입력값 검증
        if (!name || !monthly_price || !per_class_price || !schedules || !Array.isArray(schedules)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '필수 입력값이 누락되었습니다.'
            });
        }

        // instructor_id 처리
        let instructor_id = null;
        if (instructor_name && instructor_name.trim()) {
            const [instructor] = await connection.execute(
                'SELECT id FROM instructors WHERE name = ?',
                [instructor_name.trim()]
            );

            if (instructor.length > 0) {
                instructor_id = instructor[0].id;
            }
        }

        // 수업 정보 업데이트
        await connection.execute(
            'UPDATE programs SET name = ?, instructor_id = ?, monthly_price = ?, per_class_price = ? WHERE id = ?',
            [
                name,
                instructor_id,
                parseInt(monthly_price) || 0,
                parseInt(per_class_price) || 0,
                id
            ]
        );

        // 기존 스케줄 삭제
        await connection.execute('DELETE FROM class_schedules WHERE program_id = ?', [id]);

        // 새로운 스케줄 추가
        for (const schedule of schedules) {
            if (!schedule.day || !schedule.startTime || !schedule.endTime) {
                continue; // 잘못된 스케줄 데이터는 건너뛰기
            }

            await connection.execute(
                'INSERT INTO class_schedules (program_id, day, start_time, end_time, details, color) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    id,
                    schedule.day,
                    schedule.startTime,
                    schedule.endTime,
                    schedule.details || null,
                    schedule.color || '#E56736'
                ]
            );
        }

        await connection.commit();
        res.json({ 
            success: true, 
            message: '수업이 성공적으로 수정되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('수업 수정 에러:', err);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.'
        });
    } finally {
        connection.release();
    }
});

app.delete('/api/programs/:id', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        const [enrollments] = await connection.execute(
            'SELECT COUNT(*) as count FROM enrollments WHERE program_id = ?',
            [id]
        );

        if (enrollments[0].count > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '수업을 등록한 회원이 있어 삭제할 수 없습니다.'
            });
        }

        const [program] = await connection.execute(
            'SELECT id FROM programs WHERE id = ?',
            [id]
        );

        if (program.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: '해당 수업을 찾을 수 없습니다.'
            });
        }
        
        await connection.execute('DELETE FROM programs WHERE id = ?', [id]);
        
        await connection.commit();
        res.json({
            success: true,
            message: '수업이 성공적으로 삭제되었습니다.'
        });
    } catch (err) {
        await connection.rollback();
        console.error('수업 삭제 에러:', err);
        res.status(500).json({
            success: false,
            message: '수업 삭제 중 오류가 발생했습니다.'
        });
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