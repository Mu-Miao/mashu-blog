from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select

from ..deps import optional_admin, require_admin
from ..db import get_session
from ..models import Tool, now

router = APIRouter(prefix="/tools", tags=["tools"])


def tool_to_dict(tool: Tool) -> dict:
    return {
        "id": tool.id,
        "name": tool.name,
        "description": tool.description,
        "download_url": tool.download_url,
        "version": tool.version,
        "platform": tool.platform,
        "access_code": tool.access_code,
        "status": tool.status,
        "created_at": tool.created_at.isoformat(),
        "updated_at": tool.updated_at.isoformat(),
    }


def validate_payload(data: dict, *, partial: bool = False) -> dict:
    allowed = {
        "name", "description", "download_url", "version", "platform",
        "access_code", "status",
    }
    clean = {key: value.strip() if isinstance(value, str) else value
             for key, value in data.items() if key in allowed}

    if not partial or "name" in clean:
        name = clean.get("name", "")
        if not isinstance(name, str) or not name:
            raise HTTPException(400, "请填写工具名称")
        if len(name) > 100:
            raise HTTPException(400, "工具名称不能超过 100 个字符")

    if not partial or "download_url" in clean:
        download_url = clean.get("download_url", "")
        parsed = urlparse(download_url) if isinstance(download_url, str) else None
        if not parsed or parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise HTTPException(400, "请填写有效的 http(s) 网盘链接")

    limits = {"description": 500, "version": 50, "platform": 50, "access_code": 50}
    for field, limit in limits.items():
        value = clean.get(field)
        if value is not None and (not isinstance(value, str) or len(value) > limit):
            raise HTTPException(400, f"字段 {field} 最多 {limit} 个字符")

    if "status" in clean and clean["status"] not in {"draft", "published"}:
        raise HTTPException(400, "状态只能是 draft 或 published")
    return clean


@router.get("")
def list_tools(
    all: bool = Query(False),
    user: str | None = Depends(optional_admin),
):
    if all and not user:
        raise HTTPException(401, "未登录")
    with get_session() as session:
        statement = select(Tool).order_by(Tool.updated_at.desc())
        if not all:
            statement = statement.where(Tool.status == "published")
        return [tool_to_dict(tool) for tool in session.exec(statement).all()]


@router.post("")
def create_tool(data: dict, user: str = Depends(require_admin)):
    clean = validate_payload(data)
    tool = Tool(**clean)
    with get_session() as session:
        session.add(tool)
        session.commit()
        session.refresh(tool)
        return tool_to_dict(tool)


@router.put("/{tool_id}")
def update_tool(tool_id: int, data: dict, user: str = Depends(require_admin)):
    clean = validate_payload(data, partial=True)
    with get_session() as session:
        tool = session.get(Tool, tool_id)
        if not tool:
            raise HTTPException(404, "工具不存在")
        for field, value in clean.items():
            setattr(tool, field, value)
        tool.updated_at = now()
        session.add(tool)
        session.commit()
        session.refresh(tool)
        return tool_to_dict(tool)


@router.delete("/{tool_id}", status_code=204)
def delete_tool(tool_id: int, user: str = Depends(require_admin)):
    with get_session() as session:
        tool = session.get(Tool, tool_id)
        if not tool:
            raise HTTPException(404, "工具不存在")
        session.delete(tool)
        session.commit()
