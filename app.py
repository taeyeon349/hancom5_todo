import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import sqlite3
import pymysql

app = Flask(__name__)
CORS(app)
app.secret_key = 'hancom_secret_key_for_session'

SQLITE_DB = 'todo.db'

# 데이터베이스 연결 설정
MYSQL_CONFIG = {
    'host': '10.0.2.50',
    'user': 'root',
    'password': '1234',
    'database': 'todo_log_db',
    'charset': 'utf8mb4'
}

# 데이터베이스 및 테이블 자동 초기화 (DDL)
def init_db():
    # 1. 로컬 데이터 저장용 SQLite 초기화
    with sqlite3.connect(SQLITE_DB) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS member (
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                uname TEXT NOT NULL,
                uid TEXT NOT NULL UNIQUE,
                upwd TEXT NOT NULL,
                datetime TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS todolist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                uid TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                datetime TEXT NOT NULL
            )
        """)
        
        # 기본 테스트용 사용자 계정 인젝션
        cursor.execute("INSERT OR IGNORE INTO member (idx, uname, uid, upwd, datetime) VALUES (1, '홍길동', 'testuser', '1234', ?)", (str(datetime.now()),))
        conn.commit()

    # 2. 원격 감사 로그 저장용 MySQL 초기화
    try:
        conn = pymysql.connect(host=MYSQL_CONFIG['host'], user=MYSQL_CONFIG['user'], password=MYSQL_CONFIG['password'])
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_CONFIG['database']}")
        conn.commit()
        conn.close()

        conn = pymysql.connect(**MYSQL_CONFIG)
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS query_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    type VARCHAR(10) NOT NULL,
                    sql_text TEXT NOT NULL,
                    datetime DATETIME NOT NULL
                )
            """)
            conn.commit()
    except Exception as e:
        print(f"⚠️ MySQL 로깅 초기화 실패: {e}")
    finally:
        try:
            if 'conn' in locals() and isinstance(conn, pymysql.connections.Connection) and conn.open:
                conn.close()
        except:
            pass

# 외부 MySQL 데이터베이스에 쿼리 로그 기록
def log_query_to_mysql(sql_statement):
    sql_stripped = sql_statement.strip()
    if not sql_stripped:
        return
    query_type = sql_stripped.split()[0].lower()
    
    try:
        conn = pymysql.connect(**MYSQL_CONFIG)
        with conn.cursor() as cursor:
            sql = "INSERT INTO query_log (type, sql_text, datetime) VALUES (%s, %s, %s)"
            cursor.execute(sql, (query_type, sql_stripped, datetime.now()))
            conn.commit()
    except Exception as e:
        print(f"❌ MySQL 로그 기록 오류: {e}")
    finally:
        try:
            if 'conn' in locals() and isinstance(conn, pymysql.connections.Connection) and conn.open:
                conn.close()
        except:
            pass

# SQLite 쿼리 실행 및 외부 로그 연동 처리
def execute_sqlite(query, params=(), is_select=False):
    log_query_to_mysql(query)  # 실행 대상 SQL 구문을 외부 로그 서버로 전송
    with sqlite3.connect(SQLITE_DB) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(query, params)
        if is_select:
            result = cursor.fetchall()
            return [dict(row) for row in result]
        conn.commit()
        return cursor.lastrowid

# --- 엔드포인트 라우팅 및 API 명세 ---

@app.route('/')
def index():
    return render_template('index.html')

# 👤 회원가입 API 엔드포인트
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    uid = data.get('uid')
    upwd = data.get('upwd')
    uname = data.get('uname')
    
    if not uid or not upwd or not uname:
        return jsonify({'error': '모든 필드를 입력해야 합니다.'}), 400
        
    try:
        query = "INSERT INTO member (uname, uid, upwd, datetime) VALUES (?, ?, ?, ?)"
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        execute_sqlite(query, (uname, uid, upwd, current_time))
        return jsonify({'message': 'Sign up success'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': '이미 존재하는 아이디입니다.'}), 409

# 🔐 로그인 API 엔드포인트
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    uid = data.get('uid')
    upwd = data.get('upwd')
    
    query = "SELECT uid, uname FROM member WHERE uid = ? AND upwd = ?"
    user = execute_sqlite(query, (uid, upwd), is_select=True)
    
    if user:
        return jsonify({'message': 'Login success', 'user': user[0]}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/todos', methods=['GET'])
def get_todos():
    uid = request.args.get('uid', 'testuser')
    query = "SELECT id, title, uid, completed, datetime FROM todolist WHERE uid = ? ORDER BY id DESC"
    todos = execute_sqlite(query, (uid,), is_select=True)
    return jsonify(todos), 200

@app.route('/todos', methods=['POST'])
def add_todo():
    data = request.get_json()
    title = data.get('title')
    uid = data.get('uid', 'testuser')
    
    if not title:
        return jsonify({'error': 'Title is required'}), 400
        
    query = "INSERT INTO todolist (title, uid, completed, datetime) VALUES (?, ?, 0, ?)"
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    last_id = execute_sqlite(query, (title, uid, current_time))
    return jsonify({'id': last_id, 'title': title, 'uid': uid, 'completed': 0, 'datetime': current_time}), 201

@app.route('/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    data = request.get_json()
    completed = 1 if data.get('completed') else 0
    
    query = "UPDATE todolist SET completed = ? WHERE id = ?"
    execute_sqlite(query, (completed, todo_id))
    return jsonify({'message': 'Successfully updated'}), 200

@app.route('/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    query = "DELETE FROM todolist WHERE id = ?"
    execute_sqlite(query, (todo_id,))
    return jsonify({'message': 'Successfully deleted'}), 200

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)