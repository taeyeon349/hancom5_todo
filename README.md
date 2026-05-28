# 📝 프로젝트 개요
본 시스템은 Flask 백엔드, 로컬 데이터 저장용 SQLite, 그리고 외부 연동용 MySQL 서버를 활용한 데이터 이원화 아키텍처 기반의 할 일 관리(Todo) 웹 애플리케이션입니다.

## 🛠️ 개발 및 구동 환경
- **Language**: Python 3.12
- **Framework**: Flask 3.1.3
- **Database (Main)**: SQLite 3 (`todo.db`)
- **Database (Log)**: MySQL 8.0+ (`todo_log_db`)
- **Frontend**: HTML5, Bootstrap 5.3, jQuery 3.6.4 (AJAX)

## 🚀 실행 방법
1. 저장소를 로컬 환경으로 클론합니다.
~~~bash
git clone https://github.com/taeyeon349/hancom5_todo.git
cd hancom5_todo
~~~

2. 프로젝트 구동에 필요한 필수 패키지들을 가상환경에 설치합니다.
~~~bash
pip install -r requirements.txt
~~~

3. (선택 사항) 운영 환경에 맞춰 외부 MySQL 접속 정보를 환경 변수로 지정할 수 있습니다. 지정을 생략하면 코드 내 정의된 기본값(`10.0.2.50`)으로 가동됩니다.
~~~bash
export MYSQL_HOST="10.0.2.50"
export MYSQL_PASSWORD="1234"
~~~

4. 메인 파이썬 스크립트를 실행합니다. 실행 시 필요한 SQLite 및 MySQL 데이터베이스/테이블 스키마(DDL)가 자동 서빙됩니다.
~~~bash
python app.py
~~~

5. 브라우저를 열고 아래 주소로 접속합니다.
- `http://localhost:5000`

---

## 📊 엔드포인트 명세 및 API 테스트 결과 확인

### 1. 사용자 인증 및 관리 (Member)
- **회원가입 (POST /register)**
  - Request Body (JSON): `{"uname": "관리자", "uid": "admin", "upwd": "1234"}`
  - Response (201 Created): `{"message": "Sign up success"}`
- **로그인 (POST /login)**
  - Request Body (JSON): `{"uid": "admin", "upwd": "1234"}`
  - Response (200 OK): `{"message": "Login success", "user": {"uid": "admin", "uname": "관리자"}}`

### 2. 할 일 관리 서비스 (Todo)
- **목록 조회 (GET /todos?uid=유저ID)**
  - Response (200 OK): `[{"id": 1, "title": "과제 제출", "uid": "admin", "completed": 0, "datetime": "2026-05-28 02:08:16"}, ...]`
- **항목 추가 (POST /todos)**
  - Request Body (JSON): `{"title": "새로운 할 일", "uid": "admin"}`
  - Response (201 Created): `{"id": 1, "title": "새로운 할 일", ...}`
- **상태 수정 (PUT /todos/<int:todo_id>)**
  - Request Body (JSON): `{"completed": true}`
  - Response (200 OK): `{"message": "Successfully updated"}`
- **항목 삭제 (DELETE /todos/<int:todo_id>)**
  - Response (200 OK): `{"message": "Successfully deleted"}`

### 3. 외부 MySQL 감사 로그 확인
웹 서비스에서 발생하는 모든 데이터 제어문(DML)은 실시간으로 외부 로그 데이터베이스 서버로 전송됩니다. MySQL 쉘에 접속하여 아래 쿼리를 수행하면 수집된 히스토리를 대조할 수 있습니다.

~~~sql
USE todo_log_db;
SELECT * FROM query_log;
~~~
