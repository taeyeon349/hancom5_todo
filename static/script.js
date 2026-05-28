$(document).ready(function () {
    let currentUid = '';

    // 회원가입 처리 비동기 통신 (POST)
    $('#submit-register-btn').on('click', function () {
        const uname = $('#reg-name').val().trim();
        const uid = $('#reg-id').val().trim();
        const upwd = $('#reg-pwd').val().trim();

        if (!uname || !uid || !upwd) {
            alert('모든 항목을 정확히 입력해주세요.');
            return;
        }

        $.ajax({
            url: '/register',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ uname: uname, uid: uid, upwd: upwd }),
            success: function (response) {
                alert('회원가입이 완료되었습니다! 가입하신 정보로 로그인해주세요.');
                // 입력창 초기화 및 모달 닫기
                $('#reg-name').val('');
                $('#reg-id').val('');
                $('#reg-pwd').val('');
                $('#registerModal').modal('hide');
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : '회원가입 실패';
                alert(`❌ 회원가입 오류: ${errorMsg}`);
            }
        });
    });

    // 로그인 처리 인증 비동기 통신 (POST)
    $('#login-btn').on('click', function () {
        const uid = $('#login-id').val().trim();
        const upwd = $('#login-pwd').val().trim();

        if (!uid || !upwd) {
            alert('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        $.ajax({
            url: '/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ uid: uid, upwd: upwd }),
            success: function (response) {
                alert(`${response.user.uname}님 시스템 접속을 승인합니다.`);
                currentUid = response.user.uid;
                
                $('#user-display').text(`${response.user.uname}(${currentUid})`);
                $('#login-section').hide();
                $('#todo-section').show();

                fetchTodos();
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : '인증 실패';
                alert(`❌ 접속 실패: ${errorMsg}`);
            }
        });
    });

    // 전체 할 일 목록 로드 (GET)
    function fetchTodos() {
        $.ajax({
            url: `/todos?uid=${currentUid}`,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                const $todoList = $('#todo-list');
                $todoList.empty();

                if (data.length === 0) {
                    $todoList.append('<li class="list-group-item text-center text-muted">등록된 항목이 없습니다.</li>');
                    return;
                }

                data.forEach(function (todo) {
                    const isChecked = todo.completed ? 'checked' : '';
                    const textClass = todo.completed ? 'completed' : '';

                    const listItem = `
                        <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${todo.id}">
                            <div>
                                <input class="form-check-input me-2 todo-toggle" type="checkbox" ${isChecked}>
                                <span class="todo-title ${textClass}">${todo.title}</span>
                                <small class="text-muted ms-3" style="font-size: 0.73rem;">(${todo.datetime})</small>
                            </div>
                            <button class="btn btn-danger btn-sm delete-btn">삭제</button>
                        </li>
                    `;
                    $todoList.append(listItem);
                });
            },
            error: function () {
                alert('데이터 조회에 실패했습니다.');
            }
        });
    }

    // 데이터 항목 추가 (POST)
    $('#add-btn').on('click', function () {
        addTodoItem();
    });

    $('#todo-input').on('keypress', function (e) {
        if (e.which === 13) {
            addTodoItem();
        }
    });

    function addTodoItem() {
        const title = $('#todo-input').val().trim();
        if (!title) {
            alert('내용을 입력해주세요.');
            return;
        }

        $.ajax({
            url: '/todos',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ title: title, uid: currentUid }),
            success: function () {
                $('#todo-input').val('');
                fetchTodos();
            },
            error: function () {
                alert('데이터 저장에 실패했습니다.');
            }
        });
    }

    // 데이터 상태 변경 업데이트 (PUT)
    $(document).on('change', '.todo-toggle', function () {
        const $li = $(this).closest('li');
        const todoId = $li.data('id');
        const isCompleted = $(this).is(':checked');

        $.ajax({
            url: `/todos/${todoId}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ completed: isCompleted }),
            success: function () {
                if (isCompleted) {
                    $li.find('.todo-title').addClass('completed');
                } else {
                    $li.find('.todo-title').removeClass('completed');
                }
            },
            error: function () {
                alert('상태 업데이트에 실패했습니다.');
                $(this).prop('checked', !isCompleted);
            }
        });
    });

    // 데이터 삭제 처리 (DELETE)
    $(document).on('click', '.delete-btn', function () {
        if (!confirm('해당 항목을 삭제하시겠습니까?')) return;

        const $li = $(this).closest('li');
        const todoId = $li.data('id');

        $.ajax({
            url: `/todos/${todoId}`,
            type: 'DELETE',
            success: function () {
                $li.remove();
            },
            error: function () {
                alert('삭제 처리에 실패했습니다.');
            }
        });
    });

    // 시스템 로그아웃 세션 클리어
    $(document).on('click', '#logout-btn', function () {
        if (!confirm('로그아웃 하시겠습니까?')) return;
        
        currentUid = '';
        $('#login-id').val('');
        $('#login-pwd').val('');
        
        $('#todo-section').hide();
        $('#login-section').show();
    });
});