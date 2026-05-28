let currentUserId = "";

$(document).ready(function () {
    // [로그인]
    $("#login-btn").click(function () {
        const uid = $("#login-id").val().trim();
        const upwd = $("#login-pwd").val().trim();

        if (!uid || !upwd) {
            alert("아이디와 비밀번호를 모두 입력해 주세요.");
            return;
        }

        $.ajax({
            url: "/login",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ uid: uid, upwd: upwd }),
            success: function (response) {
                alert(`${response.user.uname}님, 환영합니다!`);
                currentUserId = response.user.uid;
                
                $("#user-display").text(`${response.user.uname}(${response.user.uid})`);
                $("#login-section").hide();
                $("#todo-section").show();
                
                loadTodoList(currentUserId);
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "로그인 실패";
                alert(`❌ 오류: ${errorMsg}`);
            }
        });
    });

    // [회원가입]
    $("#submit-register-btn").click(function () {
        const uname = $("#reg-name").val().trim();
        const uid = $("#reg-id").val().trim();
        const upwd = $("#reg-pwd").val().trim();

        if (!uname || !uid || !upwd) {
            alert("모든 필드를 빠짐없이 입력해 주세요.");
            return;
        }

        $.ajax({
            url: "/register",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ uname: uname, uid: uid, upwd: upwd }),
            success: function (response) {
                alert("회원가입이 완료되었습니다! 로그인해 주세요.");
                $("#reg-name").val("");
                $("#reg-id").val("");
                $("#reg-pwd").val("");
                $("#registerModal").modal("hide");
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "회원가입 실패";
                alert(`❌ 오류: ${errorMsg}`);
            }
        });
    });

    // [로그아웃]
    $("#logout-btn").click(function () {
        $.ajax({
            url: "/logout",
            type: "POST",
            success: function () {
                alert("로그아웃 되었습니다.");
                currentUserId = "";
                $("#login-id").val("");
                $("#login-pwd").val("");
                $("#todo-list").empty();
                $("#todo-section").hide();
                $("#login-section").show();
            },
            error: function () {
                alert("로그아웃 처리 중 오류가 발생했습니다.");
            }
        });
    });

    // [할 일 목록 조회]
    function loadTodoList(uid) {
        $.ajax({
            url: `/todos?uid=${encodeURIComponent(uid)}`,
            type: "GET",
            success: function (todos) {
                const $todoList = $("#todo-list");
                $todoList.empty();

                if (todos.length === 0) {
                    $todoList.append('<li class="list-group-item text-center text-muted py-3">등록된 할 일이 없습니다.</li>');
                    return;
                }

                todos.forEach(function (todo) {
                    const isCompleted = todo.completed === 1;
                    const textClass = isCompleted ? "completed" : "";
                    const checkedAttr = isCompleted ? "checked" : "";

                    const liHtml = `
                        <li class="list-group-item d-flex justify-content-between align-items-center py-2" data-id="${todo.id}">
                            <div class="d-flex align-items-center gap-3 w-70">
                                <input class="form-check-input todo-toggle" type="checkbox" ${checkedAttr}>
                                <span class="todo-title ${textClass}" style="word-break: break-all;">${todo.title}</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <small class="text-muted" style="font-size: 0.75rem;">${todo.datetime}</small>
                                <button class="btn btn-sm btn-outline-danger todo-delete-btn" type="button">삭제</button>
                            </div>
                        </li>
                    `;
                    $todoList.append(liHtml);
                });
            },
            error: function () {
                alert("할 일 목록을 불러오는 데 실패했습니다.");
            }
        });
    }

    // [할 일 추가]
    $("#add-btn").click(function () {
        const title = $("#todo-input").val().trim();
        if (!title) {
            alert("할 일 내용을 입력해 주세요.");
            return;
        }

        $.ajax({
            url: "/todos",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ title: title, uid: currentUserId }),
            success: function () {
                $("#todo-input").val("");
                loadTodoList(currentUserId);
            },
            error: function () {
                alert("항목 추가에 실패했습니다.");
            }
        });
    });

    $("#todo-input").keypress(function (e) {
        if (e.which === 13) { $("#add-btn").click(); }
    });

    // [할 일 상태 토글]
    $(document).on("change", ".todo-toggle", function () {
        const $li = $(this).closest("li");
        const todoId = $li.data("id");
        const isChecked = $(this).is(":checked");

        $.ajax({
            url: `/todos/${todoId}`,
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ completed: isChecked }),
            success: function () {
                if (isChecked) {
                    $li.find(".todo-title").addClass("completed");
                } else {
                    $li.find(".todo-title").removeClass("completed");
                }
            },
            error: function () {
                alert("상태 변경에 실패했습니다.");
                $(this).prop("checked", !isChecked);
            }
        });
    });

    // [할 일 삭제]
    $(document).on("click", ".todo-delete-btn", function () {
        if (!confirm("이 항목을 삭제하시겠습니까?")) return;

        const $li = $(this).closest("li");
        const todoId = $li.data("id");

        $.ajax({
            url: `/todos/${todoId}`,
            type: "DELETE",
            success: function () {
                loadTodoList(currentUserId);
            },
            error: function () {
                alert("항목 삭제에 실패했습니다.");
            }
        });
    });
});