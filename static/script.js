$(document).ready(function () {
    const currentUid = 'testuser';

    fetchTodos();

    function fetchTodos() {
        $.ajax({
            url: `/todos?uid=${currentUid}`,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                const $todoList = $('#todo-list');
                $todoList.empty();

                if(data.length === 0) {
                    $todoList.append('<li class="list-group-item text-center text-muted">등록된 할 일이 없습니다.</li>');
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
                                <small class="text-muted ms-3" style="font-size: 0.75rem;">(${todo.datetime})</small>
                            </div>
                            <button class="btn btn-danger btn-sm delete-btn">삭제</button>
                        </li>
                    `;
                    $todoList.append(listItem);
                });
            },
            error: function (xhr, status, error) {
                alert('할 일 목록을 가져오는 데 실패했습니다.');
            }
        });
    }

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
                alert('할 일을 추가하지 못했습니다.');
            }
        });
    }

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
                alert('상태 변경에 실패했습니다.');
                $(this).prop('checked', !isCompleted);
            }
        });
    });

    $(document).on('click', '.delete-btn', function () {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const $li = $(this).closest('li');
        const todoId = $li.data('id');

        $.ajax({
            url: `/todos/${todoId}`,
            type: 'DELETE',
            success: function () {
                $li.remove();
            },
            error: function () {
                alert('삭제에 실패했습니다.');
            }
        });
    });
});