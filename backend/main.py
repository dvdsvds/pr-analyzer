from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from github import Github
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="PR Analyzer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://pr-analyzer-sandy.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

def parse_diff(diff: str, filename: str):
    if not diff:
        return []

    hunks = []
    current_hunk = None
    old_line = 0
    new_line = 0
    
    for line in diff.split("\n"):
        if line.startswith("@@"):
            import re
            match = re.search(r"-(\d+)(?:,\d+)? \+(\d+)(?:,\d+)?", line)
            if match:
                old_line = int(match.group(1))
                new_line = int(match.group(2))
                current_hunk = {
                    "old_start": old_line,
                    "new_start": new_line,
                    "changes": []
                }
                hunks.append(current_hunk)
        elif current_hunk is not None:
            if line.startswith("-"):
                current_hunk["changes"].append({
                    "type": "removed",
                    "line": old_line,
                    "content": line[1:].strip()
                })
                old_line += 1
            elif line.startswith("+"):
                current_hunk["changes"].append({
                    "type": "added",
                    "line": new_line,
                    "content": line[1:].strip()
                })
                new_line += 1
            else:
                old_line += 1
                new_line += 1

    return hunks

gh = Github(os.getenv("GITHUB_TOKEN"))

class PRRequest(BaseModel):
    repo: str
    pr_number: int
    token: str | None = None

@app.get("/")
def root():
    return {"status": "ok", "service": "PR Analyzer API"}

@app.post("/analyze")
def analyze_pr(req: PRRequest):
    try:
        client = Github(req.token) if req.token else gh
        repo = gh.get_repo(req.repo)
        pr = repo.get_pull(req.pr_number)
        files = pr.get_files()

        changed_files = []
        for f in files:
            changed_files.append({
                "filename": f.filename,
                "status": f.status,
                "additions": f.additions,
                "deletions": f.deletions,
                "diff": f.patch if f.patch else "",
                "hunks": parse_diff(f.patch, f.filename) if f.patch else [],
            })

        review_points = []
        has_test = any(
            "test" in f["filename"].lower() or "spec" in f["filename"].lower()
            for f in changed_files
        )
        if not has_test:
            review_points.append("테스트 파일 변경이 없어요")

        for f in changed_files:
            size = f["additions"] + f["deletions"]

            if size > 200:
                review_points.append(f"{f['filename']} - 변경량이 커요 ({size}줄)")
            if f["status"] == "removed":
                review_points.append(f"{f['filename']} - 파일이 삭제됐어요")
            if f["status"] == "modified" and not f["diff"]:
                review_points.append(f"{f['filename']} - 바이너리 파일이 변경됐어요")
            
        file_count = len(changed_files)
        total_changes = sum(f["additions"] + f["deletions"] for f in changed_files)
        removed_files = [f["filename"] for f in changed_files if f["status"] == "removed"]
        added_files = [f["filename"] for f in changed_files if f["status"] == "added"]
        modified_files = [f["filename"] for f in changed_files if f["status"] == "modified"]

        summary_lines = []
        summary_lines.append(f"이 PR은 {file_count}개 파일을 변경했고, 총 {total_changes}줄이 수정됐어요.")

        if added_files:
            summary_lines.append(f"새로 추가된 파일: {', '.join(added_files)}")
        if removed_files:
            summary_lines.append(f"삭제된 파일: {', '.join(removed_files)}")
        if modified_files:
            summary_lines.append(f"수정된 파일: {', '.join(modified_files)}")
        if not has_test:
            summary_lines.append("테스트 파일 변경이 없어 주의가 필요해요")

        summary = " / ".join(summary_lines)

        return {
            "title": pr.title,
            "author": pr.user.login,
            "base": pr.base.ref,
            "head": pr.head.ref,
            "changed_files": changed_files,
            "total_additions": sum(f["additions"] for f in changed_files),
            "total_deletions": sum(f["deletions"] for f in changed_files),
            "review_points": review_points,
            "summary": summary,
            "added_files": added_files,
            "removed_files": removed_files,
            "modified_files": modified_files,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
class RepoListRequest(BaseModel):
    token: str
    include_private: bool = False

@app.post("/repos")
def get_repos(req: RepoListRequest):
    try:
        client = Github(req.token)
        user = client.get_user()
        repos = user.get_repos(sort="updated")
        
        result = []
        for repo in repos:
            if repo.private and not req.include_private:
                continue
            result.append({
                "name": repo.full_name,
                "private": repo.private,
                "description": repo.description or "",
                "updated_at": repo.updated_at.strftime("%Y-%m-%d"),
            })
        
        return {"repos": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))