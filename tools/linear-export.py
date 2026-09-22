#!/usr/bin/env python3
"""Linear -> docs/linear-archive/ 미러. 이슈당 1파일, 코멘트 원문, 멱등.

work-history 스킬의 export 계약 참조 구현. 대상 저장소의 `tools/`로 복사해 쓴다.
stdlib만 사용한다 (requests·PyYAML 불필요).

계약:
  - 전 상태 전수 (backlog·canceled 포함) — "왜 안 하기로 했나"도 자산
  - 코멘트 원문 포함, createdAt 오름차순
  - 멱등: 수기 부여 frontmatter(태깅 키) 보존, 본문/코멘트만 갱신
  - 정규화 함정 5 적용 (normalize_refs / unescape_md / 상태는 state만 / updated 스냅샷)

사용:
  LINEAR_API_KEY=lin_api_... ./linear-export.py --team PLA
  ./linear-export.py --team PLA --project "VPC OpenStack" --out docs/linear-archive
  ./linear-export.py --selfcheck        # 네트워크 없이 정규화·병합 규칙만 검증
"""

import argparse
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.request

API = "https://api.linear.app/graphql"

# export가 소유하는 키. 이 목록에 없는 frontmatter 키는 수기 부여로 보고 그대로 보존한다
# (components / decision / related / 그 밖에 사람이 붙인 무엇이든).
GENERATED_KEYS = [
    "title", "status", "state_type", "type", "issues", "project",
    "milestone", "assignee", "parent", "created", "updated", "url",
]
# 파일이 처음 만들어질 때 넣어 두는 빈 태깅 키 (사람이 채운다)
TAGGING_TEMPLATE = ["components: []", "decision: []", "related: []"]

IDENT = r"[A-Z][A-Z0-9]*-\d+"

QUERY = """
query($filter: IssueFilter!, $after: String) {
  issues(filter: $filter, first: 50, after: $after, includeArchived: true) {
    pageInfo { hasNextPage endCursor }
    nodes {
      identifier title url createdAt
      description
      state { name type }
      project { name }
      projectMilestone { name }
      assignee { displayName }
      parent { identifier }
      comments(first: 100) {
        pageInfo { hasNextPage endCursor }
        nodes { body createdAt user { displayName } }
      }
    }
  }
}
"""

# 코멘트가 100건을 넘는 이슈만 이어 받는다 (흔치 않으므로 N+1을 피해 후속 조회로 처리).
COMMENTS_QUERY = """
query($id: String!, $after: String) {
  issue(id: $id) {
    comments(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { body createdAt user { displayName } }
    }
  }
}
"""


# --- 정규화 (함정 1·3) ------------------------------------------------------

def normalize_refs(text):
    """이슈 참조 표기를 플레인 `PLA-NNN`으로 축약한다 (함정 1).

    API 표면마다 표기가 다르다: MCP는 HTML 태그, GraphQL은 한글 슬러그가 붙은
    마크다운 링크. 리터럴 grep이 되도록 전부 식별자만 남긴다.
    관계 자체는 frontmatter(issues/related)로 보전하므로 링크를 잃어도 무관하다.
    """
    if not text:
        return text
    # [PLA-123 제목](https://linear.app/team/issue/PLA-123/한글-슬러그) -> PLA-123
    text = re.sub(
        r"\[[^\]]*?\]\(\s*https?://linear\.app/[^)]*?/issue/(" + IDENT + r")[^)]*\)",
        r"\1", text)
    # <issue identifier="PLA-123">...</issue> / <a ...PLA-123...>PLA-123</a> 류
    text = re.sub(r"<[^<>]*?(" + IDENT + r")[^<>]*?>(?:\s*" + IDENT + r"\s*</[^>]+>)?",
                  r"\1", text)
    # 맨 URL
    text = re.sub(r"https?://linear\.app/[^\s)]*?/issue/(" + IDENT + r")[^\s)]*",
                  r"\1", text)
    return text


def unescape_md(text):
    """Linear가 끼운 마크다운 이스케이프를 해제한다 (함정 3).

    `\\_foo\\_` 같은 표기가 남으면 리터럴 grep이 깨진다.
    ponytail: 코드블록 안까지 일괄 해제한다. Linear는 코드블록 내부를 이스케이프하지
    않으므로 실무상 무해하다. 문제가 생기면 fence 단위로 쪼개서 건너뛰면 된다.
    """
    if not text:
        return text
    return re.sub(r"\\([\\`*_{}\[\]()#+\-.!|>~])", r"\1", text)


def clean(text):
    return unescape_md(normalize_refs(text or "")).replace("\r\n", "\n").rstrip()


def yaml_scalar(value):
    """스칼라를 한 줄 frontmatter 값으로. 콜론·선행 특수문자만 인용한다."""
    s = re.sub(r"\s+", " ", str(value or "")).strip()
    if not s:
        return '""'
    if ": " in s or s[0] in "[]{}&*#?|-<>=!%@`'\"" or s.endswith(":"):
        return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'
    return s


# --- 기존 파일 병합 (멱등) --------------------------------------------------

def split_file(path):
    """(frontmatter 원문 줄들, 본문) 반환. 파일이 없으면 ([], "")."""
    try:
        with open(path, encoding="utf-8") as f:
            raw = f.read()
    except FileNotFoundError:
        return [], ""
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", raw, re.S)
    if not m:
        return [], raw
    return m.group(1).split("\n"), m.group(2)


def preserved_lines(fm_lines):
    """export가 소유하지 않는 frontmatter 줄을 원문 그대로 돌려준다."""
    out = []
    for line in fm_lines:
        key = re.match(r"([A-Za-z_][\w-]*):", line)
        if key and key.group(1) in GENERATED_KEYS:
            continue
        if line.strip():
            out.append(line)
    return out


def strip_updated(text):
    """`updated:` 줄만 제거 — 내용 변화 판정용."""
    return "\n".join(l for l in text.split("\n") if not l.startswith("updated:"))


# --- 렌더 ------------------------------------------------------------------

def render(issue, preserved, today):
    """이슈 1건 -> 아카이브 파일 본문.

    함정 2: 코멘트는 createdAt 오름차순으로 재정렬한다 (API는 최신순 반환).
    함정 4: 상태는 issue.state로만 판단한다. 본문 체크리스트는 완료 신호로 쓰지 않는다.
    함정 5: 본문은 append-only가 아니다 -> 스냅샷임을 updated로 명시한다.
    """
    state = issue.get("state") or {}
    fm = [
        "title: " + yaml_scalar(issue["title"]),
        "status: " + yaml_scalar(state.get("name")),
        "state_type: " + yaml_scalar(state.get("type")),
        "type: linear-archive",
        "issues: [%s]" % issue["identifier"],
        "project: " + yaml_scalar((issue.get("project") or {}).get("name")),
        "milestone: " + yaml_scalar((issue.get("projectMilestone") or {}).get("name")),
        "assignee: " + yaml_scalar((issue.get("assignee") or {}).get("displayName")),
        "created: " + (issue.get("createdAt") or "")[:10],
        "updated: " + today,
        "url: " + yaml_scalar(issue.get("url")),
    ]
    parent = (issue.get("parent") or {}).get("identifier")
    if parent:
        fm.insert(5, "parent: " + parent)
    fm += preserved if preserved else TAGGING_TEMPLATE

    comments = sorted((issue.get("comments") or {}).get("nodes") or [],
                      key=lambda c: c.get("createdAt") or "")
    body = ["# %s — %s" % (issue["identifier"], clean(issue["title"])), "",
            "## 본문", "", clean(issue.get("description")) or "_(없음)_", ""]
    if comments:
        body += ["## 코멘트 (%d건, 시간순)" % len(comments), ""]
        for i, c in enumerate(comments, 1):
            who = (c.get("user") or {}).get("displayName") or "?"
            body += ["### %d. %s — %s" % (i, who, (c.get("createdAt") or "")[:16].replace("T", " ")),
                     "", clean(c.get("body")) or "_(빈 코멘트)_", ""]
    return "---\n" + "\n".join(fm) + "\n---\n\n" + "\n".join(body).rstrip() + "\n"


# --- API -------------------------------------------------------------------

MAX_PAGES = 50  # 5000건. 넘으면 커서 루프를 의심하고 멈춘다 (조용히 도는 것보다 낫다)


def graphql(key, query, variables):
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": query, "variables": variables}).encode(),
        headers={"Content-Type": "application/json", "Authorization": key},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        payload = json.load(r)
    if payload.get("errors"):
        raise SystemExit("Linear API 오류: " + json.dumps(payload["errors"], ensure_ascii=False))
    return payload["data"]


def collect_comments(issue, fetch_more):
    """코멘트 커넥션이 잘렸으면 끝까지 이어 받는다.

    조용한 절단 금지: 100건에서 멈추면 오래 논의된 이슈의 뒷부분이 말없이 사라진다.
    회수 인프라가 "다 가져왔다"로 읽히면서 자산을 잃는 것이 이 스크립트 최악의 실패다.
    fetch_more(identifier, after) -> (nodes, pageInfo)
    """
    conn = issue.get("comments") or {}
    nodes = list(conn.get("nodes") or [])
    info = conn.get("pageInfo") or {}
    pages = 0
    while info.get("hasNextPage"):
        pages += 1
        if pages > MAX_PAGES:
            raise SystemExit("%s: 코멘트 페이지가 %d쪽을 넘었다 — 커서 루프 의심"
                             % (issue["identifier"], MAX_PAGES))
        more, info = fetch_more(issue["identifier"], info.get("endCursor"))
        nodes += more
    return nodes


def fetch_all(key, team, project):
    flt = {"team": {"key": {"eq": team}}}
    if project:
        flt = {"and": [flt, {"project": {"name": {"eq": project}}}]}
    after, issues = None, []
    while True:
        page = graphql(key, QUERY, {"filter": flt, "after": after})["issues"]
        issues += page["nodes"]
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]

    def fetch_more(ident, cursor):
        conn = graphql(key, COMMENTS_QUERY, {"id": ident, "after": cursor})["issue"]["comments"]
        return conn["nodes"], conn["pageInfo"]

    for issue in issues:
        truncated = ((issue.get("comments") or {}).get("pageInfo") or {}).get("hasNextPage")
        if truncated:
            issue.setdefault("comments", {})["nodes"] = collect_comments(issue, fetch_more)
            print("  %s: 코멘트 100건 초과 — %d건까지 이어 받았다"
                  % (issue["identifier"], len(issue["comments"]["nodes"])))
    return issues


# --- 자체 검증 -------------------------------------------------------------

def selfcheck():
    # 함정 1 — 세 가지 참조 표기가 모두 플레인 식별자로
    assert normalize_refs(
        "[PLA-123 스캐너 개편](https://linear.app/iteasy/issue/PLA-123/스캐너-개편)"
    ) == "PLA-123"
    assert normalize_refs('<issue identifier="PLA-9">PLA-9</issue>') == "PLA-9"
    assert normalize_refs(
        "참조 https://linear.app/iteasy/issue/LAM-45/foo-bar 끝") == "참조 LAM-45 끝"
    assert normalize_refs("PLA-1 은 그대로") == "PLA-1 은 그대로"

    # 함정 3 — 이스케이프 해제 후 리터럴 grep 성립
    assert unescape_md(r"\_SessionLocal\_ 재바인딩") == "_SessionLocal_ 재바인딩"
    assert unescape_md(r"경로 docs\/worklog") == r"경로 docs\/worklog"  # 목록 밖 문자는 보존

    # 함정 2 — 코멘트 시간 오름차순
    issue = {
        "identifier": "PLA-7", "title": "제목: 콜론 포함", "url": "https://x/PLA-7",
        "createdAt": "2026-01-02T03:04:05.000Z", "description": "본문 [PLA-8 링크](https://linear.app/t/issue/PLA-8/슬러그)",
        "state": {"name": "Canceled", "type": "canceled"},
        "project": {"name": "P"}, "projectMilestone": None,
        "assignee": {"displayName": "이상준"}, "parent": None,
        "comments": {"nodes": [
            {"body": "나중", "createdAt": "2026-03-01T00:00:00.000Z", "user": {"displayName": "b"}},
            {"body": "먼저", "createdAt": "2026-02-01T00:00:00.000Z", "user": {"displayName": "a"}},
        ]},
    }
    out = render(issue, [], "2026-07-30")
    assert out.index("먼저") < out.index("나중"), "코멘트가 시간순이 아니다"

    # 함정 4 — 상태는 state에서만 온다
    assert "status: Canceled" in out and "state_type: canceled" in out
    # 콜론 포함 제목은 인용된다
    assert 'title: "제목: 콜론 포함"' in out
    # 본문의 링크 표기가 축약됐다
    assert "본문 PLA-8" in out
    # 최초 생성 시 빈 태깅 키가 들어간다
    assert "components: []" in out

    # 멱등 — 수기 태깅 키 보존, 본문 변화 없으면 updated도 안 바뀐다
    keep = preserved_lines([
        "title: 낡은제목", "status: Todo", "updated: 2026-01-01",
        "components: [scanner, network]", "decision: [릴레이 경유로 전환]",
        "note: 사람이 붙인 임의 키",
    ])
    assert keep == ["components: [scanner, network]",
                    "decision: [릴레이 경유로 전환]",
                    "note: 사람이 붙인 임의 키"], keep
    merged = render(issue, keep, "2026-07-30")
    assert "components: [scanner, network]" in merged
    assert "낡은제목" not in merged, "export 소유 키는 갱신돼야 한다"
    assert strip_updated(merged) == strip_updated(render(issue, keep, "2099-01-01")), \
        "updated만 다른 두 렌더는 동일해야 한다 (재실행 시 git 노이즈 방지)"

    # 코멘트 절단 방지 — 잘린 커넥션을 끝까지 이어 받는다 (네트워크 없이 가짜 fetcher로)
    pages = {
        None: (["c101"], {"hasNextPage": True, "endCursor": "cur2"}),
        "cur2": (["c201"], {"hasNextPage": False, "endCursor": None}),
    }
    truncated = {
        "identifier": "PLA-99",
        "comments": {"nodes": ["c1"], "pageInfo": {"hasNextPage": True, "endCursor": None}},
    }
    assert collect_comments(truncated, lambda i, cur: pages[cur]) == ["c1", "c101", "c201"]
    # 잘리지 않은 커넥션은 추가 호출을 하지 않는다
    intact = {"identifier": "PLA-1",
              "comments": {"nodes": ["c1"], "pageInfo": {"hasNextPage": False}}}
    assert collect_comments(intact, lambda i, cur: (_ for _ in ()).throw(
        AssertionError("불필요한 후속 조회"))) == ["c1"]
    # 커서 루프는 조용히 돌지 않고 멈춘다
    looping = {"identifier": "PLA-0",
               "comments": {"nodes": [], "pageInfo": {"hasNextPage": True, "endCursor": "x"}}}
    try:
        collect_comments(looping, lambda i, cur: ([], {"hasNextPage": True, "endCursor": "x"}))
        raise AssertionError("커서 루프가 멈추지 않았다")
    except SystemExit as e:
        assert "커서 루프" in str(e), e

    print("selfcheck OK — 함정 5개 + 멱등 병합 + 코멘트 절단 방지 통과")


# --- main ------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--team", help="Linear 팀 키 (예: PLA)")
    ap.add_argument("--project", help="프로젝트 이름으로 범위 제한 (선택)")
    ap.add_argument("--out", default="docs/linear-archive")
    ap.add_argument("--selfcheck", action="store_true")
    args = ap.parse_args()

    if args.selfcheck:
        return selfcheck()
    if not args.team:
        raise SystemExit("--team 이 필요하다 (또는 --selfcheck)")
    key = os.environ.get("LINEAR_API_KEY")
    if not key:
        raise SystemExit("LINEAR_API_KEY 환경변수가 없다. Linear Settings > API 에서 발급한다.")

    os.makedirs(args.out, exist_ok=True)
    today = datetime.date.today().isoformat()
    try:
        issues = fetch_all(key, args.team, args.project)
    except urllib.error.HTTPError as e:
        raise SystemExit("Linear API HTTP %s: %s" % (e.code, e.read().decode("utf-8", "replace")))

    written = skipped = 0
    for issue in sorted(issues, key=lambda i: i["identifier"]):
        path = os.path.join(args.out, issue["identifier"] + ".md")
        fm_lines, _ = split_file(path)
        new = render(issue, preserved_lines(fm_lines), today)
        old = None
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                old = f.read()
        # updated만 달라지는 재실행은 파일을 건드리지 않는다 (스냅샷 시점은 실제 변경 시에만 갱신)
        if old is not None and strip_updated(old) == strip_updated(new):
            skipped += 1
            continue
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
        written += 1

    print("이슈 %d건 — 갱신 %d / 변화없음 %d -> %s" % (len(issues), written, skipped, args.out))
    if written:
        print("색인을 다시 만든다: tools/gen-history-index.py")


if __name__ == "__main__":
    sys.exit(main())
