import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SkillService } from "../services/skill.service";
import type { UserSkill, SkillMarketItem } from "../entities/skill.entity";
import { Button } from "@/components/ui/Button";

interface MySkillItem extends SkillMarketItem {
  userSkill: UserSkill;
}

export function MySkillsPage() {
  const navigate = useNavigate();
  const [mySkills, setMySkills] = useState<MySkillItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMySkills();
  }, []);

  const loadMySkills = async () => {
    setIsLoading(true);
    const allSkills = await SkillService.getSkills();
    const myUserSkills = await SkillService.getMySkills();
    const enabledSkills = allSkills.filter((s) => s.isEnabled);
    const mySkillItems: MySkillItem[] = enabledSkills.map((skill) => ({
      ...skill,
      userSkill: myUserSkills.find((u) => u.skillId === skill.id) || {
        id: "",
        skillId: skill.id,
        userId: "current-user",
        config: {},
        enabled: true,
        createdAt: "",
        updatedAt: "",
      },
    }));
    setMySkills(mySkillItems);
    setIsLoading(false);
  };

  const handleDisable = async (skillId: string) => {
    await SkillService.disableSkill(skillId);
    loadMySkills();
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-shrink-0 px-6 py-5 border-b border-border bg-bg-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mr-4">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">我的技能</h1>
              <p className="text-xs text-text-muted mt-0.5">管理已启用的技能</p>
            </div>
          </div>
          <Button onClick={() => navigate("/skills")}>
            <span className="mr-2">+</span>
            添加技能
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mySkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <p className="text-lg font-medium text-text-primary mb-2">
              暂无启用的技能
            </p>
            <p className="text-sm mb-4">去技能市场添加一些技能吧</p>
            <Button onClick={() => navigate("/skills")}>浏览技能市场</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {mySkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between p-4 bg-bg-secondary border border-border rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-bg-tertiary rounded-xl text-2xl">
                    {skill.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary">
                      {skill.name}
                    </h3>
                    <p className="text-sm text-text-muted">
                      {skill.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 text-xs bg-success/10 text-success rounded-lg">
                    已启用
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisable(skill.id)}
                  >
                    禁用
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MySkillsPage;
