import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SkillMarketItem } from "../entities/skill.entity";
import { SkillResultService, SkillService } from "../services";
import { SkillCard } from "../components/SkillCard";
import { buildSkillWorkspaceLibrary } from "./skill.workspace.model";

export function MySkillsPage() {
  const navigate = useNavigate();

  const [skills, setSkills] = useState<SkillMarketItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [processingSkillId, setProcessingSkillId] = useState<string | null>(null);
  const [favoriteSkillIds, setFavoriteSkillIds] = useState<string[]>([]);
  const [recentSkillIds, setRecentSkillIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const loadMySkills = async () => {
        setIsLoading(true);
        setErrorText("");
        setStatusText("");
        try {
          const [allSkillsResult, mySkillsResult] = await Promise.all([
            SkillResultService.getSkills(undefined, keyword.trim() || undefined, "popular"),
            SkillResultService.getMySkills(),
          ]);
          if (cancelled) {
            return;
          }

          if (!allSkillsResult.success || !mySkillsResult.success) {
            setErrorText(
              allSkillsResult.error ||
                allSkillsResult.message ||
                mySkillsResult.error ||
                mySkillsResult.message ||
                "Failed to load enabled skills.",
            );
            setSkills([]);
            return;
          }

          const allSkills = allSkillsResult.data || [];
          const mySkills = mySkillsResult.data || [];

          const enabledIds = new Set(mySkills.filter((item) => item.enabled).map((item) => item.skillId));
          const enabledSkills = allSkills
            .filter((item) => item.isEnabled || enabledIds.has(item.id))
            .map((item) => ({ ...item, isEnabled: true }));

          setSkills(enabledSkills);
          setFavoriteSkillIds(SkillService.getFavoriteSkillIds());
          setRecentSkillIds(SkillService.getRecentSkillIds());
        } catch (error) {
          if (!cancelled) {
            setErrorText(error instanceof Error ? error.message : "Failed to load enabled skills.");
            setSkills([]);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      void loadMySkills();
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword]);

  const library = useMemo(
    () => buildSkillWorkspaceLibrary(skills, { favoriteSkillIds, recentSkillIds }),
    [skills, favoriteSkillIds, recentSkillIds],
  );

  const totalUsage = useMemo(
    () => library.enabled.reduce((sum, item) => sum + item.usageCount, 0),
    [library.enabled],
  );
  const avgRating = useMemo(
    () =>
      library.enabled.length === 0
        ? 0
        : library.enabled.reduce((sum, item) => sum + item.rating, 0) / library.enabled.length,
    [library.enabled],
  );

  const handleDisable = async (skillId: string) => {
    setStatusText("");
    setProcessingSkillId(skillId);
    try {
      const result = await SkillResultService.disableSkill(skillId);
      if (!result.success) {
        setErrorText(result.error || result.message || "Failed to disable skill.");
        return;
      }
      setSkills((previous) => previous.filter((item) => item.id !== skillId));
      setRecentSkillIds((previous) => previous.filter((id) => id !== skillId));
      setStatusText("Skill disabled.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to disable skill.");
    } finally {
      setProcessingSkillId(null);
    }
  };

  const handleOpenSkill = (skillId: string) => {
    const updatedRecent = SkillService.markSkillOpened(skillId);
    setRecentSkillIds(updatedRecent);
    navigate(`/skills/${skillId}`);
  };

  const handleToggleFavorite = (skillId: string) => {
    const enabled = SkillService.toggleFavoriteSkill(skillId);
    setFavoriteSkillIds(SkillService.getFavoriteSkillIds());
    setStatusText(enabled ? "Skill added to favorites." : "Skill removed from favorites.");
    setErrorText("");
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">My Skills</h1>
            <p className="mt-1 text-sm text-text-secondary">Manage all skills currently enabled for your account.</p>
          </div>
          <button
            onClick={() => navigate("/skills")}
            className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover"
          >
            Back to Marketplace
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Enabled count</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{library.enabled.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Total usage</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{totalUsage.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">Average rating</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{avgRating.toFixed(1)}</p>
          </div>
        </div>

        <div className="mt-5">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search enabled skills"
            className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none md:w-80"
          />
        </div>

        {errorText ? (
          <div className="mt-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        ) : null}

        {statusText ? (
          <div className="mt-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            {statusText}
          </div>
        ) : null}

        <div className="mt-5">
          {library.recent.length > 0 ? (
            <div className="mb-4 rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Recently Used</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {library.recent.map((item) => (
                  <button
                    key={`recent-${item.id}`}
                    onClick={() => handleOpenSkill(item.id)}
                    className="rounded-full border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
                  >
                    {item.icon} {item.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {library.favorites.length > 0 ? (
            <div className="mb-4 rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Favorites</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {library.favorites.map((item) => (
                  <button
                    key={`favorite-${item.id}`}
                    onClick={() => handleOpenSkill(item.id)}
                    className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-colors hover:brightness-110"
                  >
                    鈽?{item.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              Loading enabled skills...
            </div>
          ) : library.enabled.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
              No enabled skill found. Go to marketplace and enable at least one skill.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {library.enabled.map((skill) => (
                <div key={skill.id} className="space-y-2">
                  <SkillCard
                    skill={skill}
                    onDisable={handleDisable}
                    onClick={() => handleOpenSkill(skill.id)}
                    disabled={processingSkillId === skill.id}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenSkill(skill.id)}
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
                    >
                      Open detail
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(skill.id)}
                      className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                        favoriteSkillIds.includes(skill.id)
                          ? "border border-primary/40 bg-primary/10 text-primary hover:brightness-110"
                          : "border border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                      }`}
                    >
                      {favoriteSkillIds.includes(skill.id) ? "Favorited" : "Add favorite"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default MySkillsPage;

