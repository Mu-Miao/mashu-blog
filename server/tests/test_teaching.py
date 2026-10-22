from conftest import login


def create(client, title, tags, body="教学验证", status="published"):
    response = client.post("/api/v1/posts", json={
        "title": title, "tags": tags, "kind": "md", "body": body, "status": status,
    })
    assert response.status_code == 200
    return response.json()


def test_teaching_filters_require_section_and_hide_drafts(client):
    login(client)
    clock = create(client, "教学测试：时钟启动", ["STM32教学", "时钟与启动"], "唯一关键词启动验证")
    create(client, "教学测试：串口接收", ["STM32教学", "串口与 DMA"])
    create(client, "教学测试：时钟草稿", ["STM32教学", "时钟与启动"], status="draft")
    create(client, "普通文章：时钟", ["时钟与启动"], "唯一关键词启动验证")
    client.cookies.clear()

    response = client.get("/api/v1/posts", params={"tag": "STM32教学", "topic": "时钟与启动"})
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [clock["id"]]
    assert response.json()["total"] == 1
    searched = client.get("/api/v1/posts", params={"tag": "STM32教学", "q": "唯一关键词启动验证"}).json()
    assert [item["id"] for item in searched["items"]] == [clock["id"]]
    assert client.get("/api/v1/posts", params={"tag": "STM32教学", "topic": "不存在的专题"}).json()["total"] == 0


def test_teaching_pagination_and_literal_search(client):
    login(client)
    created = [create(client, f"中断教学验证 {index}", ["STM32教学", "中断与优先级"]) for index in range(12)]
    percentage = create(client, "占空比验证", ["STM32教学", "定时器与 PWM"], "占空比为 50%")
    create(client, "没有百分号", ["STM32教学", "定时器与 PWM"], "这里没有通配符")
    client.cookies.clear()

    page = client.get("/api/v1/posts", params={"tag": "STM32教学", "topic": "中断与优先级", "size": 5, "page": 2}).json()
    assert page["total"] == 12
    assert len(page["items"]) == 5
    assert set(item["id"] for item in page["items"]).issubset({item["id"] for item in created})
    literal = client.get("/api/v1/posts", params={"tag": "STM32教学", "topic": "定时器与 PWM", "q": "%"}).json()
    assert [item["id"] for item in literal["items"]] == [percentage["id"]]
    assert client.get("/api/v1/posts", params={"q": "x" * 201}).status_code == 422
    assert "/teaching" in client.get("/sitemap.xml").text
