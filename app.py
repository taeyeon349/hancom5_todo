import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
import pymysql

app = Flask(__name__)
CORS(app)  # CORS 문제 방지 권장사항 반영

SQLITE_DB = 'todo.db'

# 🛠️ 우리가 뚫어놓은 VM 2(DB 서버) 고정 IP 및 연동 설정
MYSQL_CONFIG = {
    'host': '10.0.2.50',         # DB 서버 고정 IP
    'user': 'root',
    'password': '변경하신_비밀번호',  # 아까 변경하신 새 비밀번호 입력
    'database': 'todo_log_db',
    'charset': 'utf8mb4'
}

# --- 데이터베이스 초기화 (DDL 자동 생성) ---
def init_db():
    # 1. SQLite 초기화 (웹 서버 내부에 파일 자동 생성)
    with sqlite3.connect(SQLITE_DB) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS member (
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                uname TEXT NOT NULL,
                uid TEXT NOT NULL UNIQUE,
                upwd TEXT NOT NULL,
                datetime TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS todolist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                uid TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                datetime TEXT NOT NULL
            )
        ''')
        cursor.execute("INSERT OR IGNORE INTO member (idx, uname, uid, upwd, datetime) VALUES (1, '홍길동', 'testuser', '1234', ?)", (str(datetime.now()),))
        conn.commit()

    # 2. MySQL 초기화 (원격 DB 서버에 자동 빌드)
    try:
        conn = pymysql.connect(host=MYSQL_CONFIG['host'], user=MYSQL_CONFIG['user'], password=MYSQL_CONFIG['password'])
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_CONFIG['database']}")
        conn.commit()
        conn.close()

        conn = pymysql.connect(**MYSQL_CONFIG)
        with conn.cursor() as cursor:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS query_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    type VARCHAR(10) NOT NULL,
                    sql_text TEXT NOT NULL,
                    datetime DATETIME NOT NULL
                )
            ''')
            conn.commit()
    except Exception as e:
        print(f"⚠️ MySQL 초기화 실패: {e}")
    finally:
        if 'conn' in locals() and conn.open:
            conn.close()

# --- MySQL 로그 기록 함수 ---
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
        if 'conn' in locals() and conn.open:
            conn.close()

# --- SQLite 쿼리 실행 헬퍼 함수 ---
def execute_sqlite(query, params=(), is_select=False):
    log_query_to_mysql(query)  # 실행되는 모든 쿼리 MySQL 원격 로깅
    
    with sqlite3.connect(SQLITE_DB) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(query, params)
        if is_select:
            result = cursor.fetchall()
            return [dict(row) for row in result]
        conn.commit()
        return cursor.lastrowid

# --- REST API 엔드포인트 ---
@app.route('/')
def index():
    return render_template('index.html')

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
    init_db()  # 가동 시 자동 DDL 구성 트리거
    app.run(host='0.0.0.0', port=5000, debug=True)