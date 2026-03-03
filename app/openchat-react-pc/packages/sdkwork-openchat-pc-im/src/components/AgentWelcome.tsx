/**
 * Agent 娆㈣繋缁勪欢
 *
 * 鑱岃矗锛氭樉绀烘櫤鑳戒綋鐨勬杩庝俊鎭拰绀轰緥闂
 */

import { memo } from "react";
import type { Agent } from "@sdkwork/openchat-pc-agent";

interface AgentWelcomeProps {
  agent: Agent;
  onSendMessage: (message: string) => void;
}

export const AgentWelcome = memo(
  ({ agent, onSendMessage }: AgentWelcomeProps) => {
    const config = agent.config as any;
    const welcomeMessage =
      config?.welcomeMessage ||
      `浣犲ソ锛佹垜鏄?${agent.name}锛屾湁浠€涔堟垜鍙互甯姪浣犵殑鍚楋紵`;
    const exampleQuestions = config?.exampleQuestions || [
      "浣犺兘鍋氫粈涔堬紵",
      "缁欐垜璁蹭釜绗戣瘽",
      "甯垜瑙ｉ噴涓€涓嬩粈涔堟槸浜哄伐鏅鸿兘",
    ];

    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary relative overflow-hidden p-8">
        {/* 鑳屾櫙瑁呴グ */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]" />
        </div>

        <div className="text-center animate-fade-in relative z-10 max-w-lg">
          {/* Agent Avatar */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-[32px] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-glow-primary">
            <span className="text-5xl">{agent.avatar || "馃"}</span>
          </div>

          {/* Agent Name */}
          <h3 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">
            {agent.name}
          </h3>

          {/* Description */}
          {agent.description && (
            <p className="text-text-tertiary text-sm mb-6">
              {agent.description}
            </p>
          )}

          {/* Welcome Message */}
          <p className="text-text-secondary text-sm mb-8 leading-relaxed">
            {welcomeMessage}
          </p>

          {/* Example Questions */}
          {exampleQuestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted uppercase tracking-wide">
                鍙互杩欐牱闂垜
              </p>
              <div className="flex flex-col gap-2">
                {exampleQuestions
                  .slice(0, 4)
                  .map((question: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => onSendMessage(question)}
                      className="px-6 py-3 bg-bg-secondary hover:bg-bg-tertiary border border-border hover:border-primary rounded-xl text-sm text-text-secondary hover:text-text-primary transition-all text-left"
                    >
                      {question}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Capabilities */}
          {agent.capabilities && agent.capabilities.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs text-text-muted mb-3">鎴戠殑鑳藉姏</p>
              <div className="flex flex-wrap justify-center gap-2">
                {agent.capabilities.slice(0, 4).map((cap) => (
                  <span
                    key={cap.name}
                    className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg"
                  >
                    {cap.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

AgentWelcome.displayName = "AgentWelcome";




