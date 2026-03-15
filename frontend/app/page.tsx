"use client";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

interface ChangedFile {
  filename: string
  status: string
  additions: number
  deletions: number
  diff: string
  hunks: Hunk[]
}

interface Hunk {
  old_start: number
  new_start: number
  changes: { type: string; line: number; content: string }[]
}

interface PRResult {
  title: string
  author: string
  base: string
  head: string
  total_additions: number
  total_deletions: number
  changed_files: ChangedFile[]
  review_points: string[]
  summary: string
  added_files: string[]
  removed_files: string[]
  modified_files: string[]
  lang_stats: { lang: string; additions: number; deletions: number; files: number }[]
}

const glass = "backdrop-blur-md bg-white/[0.02] border border-white/10 rounded-2xl";

export default function Home() {
  const [repo, setRepo] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [result, setResult] = useState<PRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const [repos, setRepos] = useState<{ name: string; private: boolean; description: string; updated_at: string }[]>([]);
  const [includePrivate, setIncludePrivate] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [collapsedHunks, setCollapsedHunks] = useState<Set<string>>(new Set());

  const toggleHunk = (fileIdx: number, hunkIdx: number) => {
    const key = `${fileIdx}-${hunkIdx}`;
    setCollapsedHunks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (!session?.accessToken) return;
    const fetchRepos = async () => {
      setLoadingRepos(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/repos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: session.accessToken, include_private: includePrivate }),
        });
        const data = await res.json();
        setRepos(data.repos);
      } finally {
        setLoadingRepos(false);
      }
    };
    fetchRepos();
  }, [session, includePrivate]);

  const analyze = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, pr_number: parseInt(prNumber), token: session?.accessToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResult(data);
      const allKeys = new Set<string>();
      data.changed_files.forEach((f: ChangedFile, fi: number) => {
        f.hunks.forEach((_: Hunk, hi: number) => allKeys.add(`${fi}-${hi}`));
      });
      setCollapsedHunks(allKeys);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full max-w-5xl mx-auto px-4 py-8 md:px-8">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PR Analyzer</h1>
          <p className="text-sm text-white/40 mt-0.5">GitHub PR 자동 분석 도구</p>
        </div>
        {session ? (
          <div className="flex items-center gap-3">
            <Image src={session.user?.image ?? ""} alt="프로필" width={28} height={28} className="rounded-full" />
            <span className="text-sm text-white/60">{session.user?.name}</span>
            <button
              onClick={() => signOut()}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn("github")}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition"
          >
            GitHub로 로그인
          </button>
        )}
      </div>

      {/* 검색창 */}
      <div className={`${glass} p-4 mb-4 flex gap-3`}>
        <input
          className="flex-1 bg-transparent outline-none text-sm placeholder-white/30"
          placeholder="owner/repo (예: facebook/react)"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
        <div className="w-px bg-white/10" />
        <input
          className="w-24 bg-transparent outline-none text-sm placeholder-white/30"
          placeholder="PR 번호"
          value={prNumber}
          onChange={(e) => setPrNumber(e.target.value)}
        />
        <button
          onClick={analyze}
          disabled={loading}
          className="px-5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-sm font-medium transition"
        >
          {loading ? "분석 중..." : "분석"}
        </button>
      </div>

      {/* 레포 목록 */}
      {session && (
        <div className={`${glass} p-4 mb-6`}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-white/70">내 레포지토리</span>
            <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
              <div
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${includePrivate ? "bg-purple-500" : "bg-white/10"}`}
                onClick={() => setIncludePrivate(!includePrivate)}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${includePrivate ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              Private 포함
            </label>
          </div>
          {loadingRepos ? (
            <p className="text-xs text-white/30">불러오는 중...</p>
          ) : (
            <div className="space-y-0.5 max-h-44 overflow-y-auto">
              {repos.map((r, i) => (
                <div
                  key={i}
                  onClick={() => setRepo(r.name)}
                  className="flex justify-between items-center text-sm px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition"
                >
                  <span className="font-mono text-white/80 text-xs">{r.name}</span>
                  <div className="flex items-center gap-2">
                    {r.private && <span className="text-xs px-1.5 py-0.5 rounded border border-white/10 text-white/30">private</span>}
                    <span className="text-xs text-white/30">{r.updated_at}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {result && (
        <div className="space-y-4">
          {/* 기본 정보 */}
          <div className={`${glass} p-5`}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-lg leading-snug">{result.title}</h2>
                <p className="text-xs text-white/40 mt-1">by {result.author} · {result.base} ← {result.head}</p>
              </div>
              <div className="flex items-center gap-3 text-sm font-mono shrink-0 ml-4">
                <span className="text-green-400">+{result.total_additions}</span>
                <span className="text-orange-400">-{result.total_deletions}</span>
                <span className="text-white/30 text-xs">{result.changed_files.length}개 파일</span>
              </div>
            </div>
          </div>

          {/* 요약 */}
          <div className={`${glass} p-5`}>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">요약</p>
            <ul className="space-y-3">
              <li className="text-sm text-white/70 flex gap-2">
                <span className="text-purple-400">·</span>{result.summary.split(" / ")[0]}
              </li>
              {result.added_files.length > 0 && (
                <li>
                  <p className="text-sm text-white/70 flex gap-2 mb-1"><span className="text-purple-400">·</span>새로 추가된 파일</p>
                  <ul className="ml-5 space-y-0.5">
                    {result.added_files.map((f, i) => (
                      <li key={i} className="text-xs text-white/40 font-mono">{f}</li>
                    ))}
                  </ul>
                </li>
              )}
              {result.modified_files.length > 0 && (
                <li>
                  <p className="text-sm text-white/70 flex gap-2 mb-1"><span className="text-purple-400">·</span>수정된 파일</p>
                  <ul className="ml-5 space-y-0.5">
                    {result.modified_files.map((f, i) => (
                      <li key={i} className="text-xs text-white/40 font-mono">{f}</li>
                    ))}
                  </ul>
                </li>
              )}
              {result.removed_files.length > 0 && (
                <li>
                  <p className="text-sm text-white/70 flex gap-2 mb-1"><span className="text-purple-400">·</span>삭제된 파일</p>
                  <ul className="ml-5 space-y-0.5">
                    {result.removed_files.map((f, i) => (
                      <li key={i} className="text-xs text-white/40 font-mono">{f}</li>
                    ))}
                  </ul>
                </li>
              )}
              {result.summary.includes("테스트") && (
                <li className="text-sm text-white/70 flex gap-2">
                  <span className="text-purple-400">·</span>테스트 파일 변경이 없어 주의가 필요해요
                </li>
              )}
            </ul>
          </div>

          {/* 언어별 통계 */}
          {result.lang_stats.length > 0 && (
            <div className={`${glass} p-5`}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">언어별 통계</p>
              <div className="space-y-3">
                {result.lang_stats.map((s, i) => {
                  const total = result.total_additions + result.total_deletions;
                  const pct = total > 0 ? Math.round(((s.additions + s.deletions) / total) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-white/70">{s.lang}</span>
                        <div className="flex gap-3 text-xs font-mono">
                          <span className="text-green-400">+{s.additions}</span>
                          <span className="text-orange-400">-{s.deletions}</span>
                          <span className="text-white/30">{s.files}개 파일</span>
                          <span className="text-white/20">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 리뷰 포인트 */}
          {result.review_points.length > 0 && (
            <div className={`${glass} p-5`}>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">리뷰 포인트</p>
              <ul className="space-y-2">
                {result.review_points.map((point, i) => (
                  <li key={i} className="text-sm text-yellow-300/80 flex gap-2 items-start">
                    <span className="text-yellow-400 mt-0.5">⚠</span>{point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 변경된 파일 */}
          <div className={`${glass} p-5`}>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">변경된 파일</p>
            <div className="space-y-4">
              {result.changed_files.map((f, i) => (
                <div key={i}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs text-white/60 break-all">{f.filename}</span>
                    <div className="flex gap-2 font-mono text-xs shrink-0 ml-4">
                      {f.additions > 0 && <span className="text-green-400">+{f.additions}</span>}
                      {f.deletions > 0 && <span className="text-orange-400">-{f.deletions}</span>}
                      {f.additions === 0 && f.deletions === 0 && <span className="text-white/20">binary</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {f.hunks.map((hunk, hi) => {
                      const key = `${i}-${hi}`;
                      const collapsed = collapsedHunks.has(key);
                      return (
                        <div key={hi} className="rounded-xl overflow-hidden border border-white/5">
                          <div
                            onClick={() => toggleHunk(i, hi)}
                            className="flex justify-between items-center px-3 py-1.5 bg-white/5 text-xs text-white/30 cursor-pointer hover:bg-white/10 transition font-mono"
                          >
                            <span>@@ -{hunk.old_start} +{hunk.new_start} @@</span>
                            <span>{collapsed ? "▶ 펼치기" : "▼ 접기"}</span>
                          </div>
                          {!collapsed && hunk.changes.map((change, ci) => (
                            <div
                              key={ci}
                              className={`px-3 py-0.5 text-xs font-mono ${
                                change.type === "added"
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              <span className="text-white/20 mr-3 select-none">{change.line}</span>
                              {change.type === "added" ? "+ " : "- "}
                              {change.content}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}