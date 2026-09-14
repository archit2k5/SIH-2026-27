import { AIQueryPanel } from "../components/ai/AIQueryPanel";

export function AIPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 h-full flex flex-col">
      <h1 className="text-[28px] font-bold text-text-primary leading-tight">AI Assistant</h1>
      <p className="text-[14px] text-text-secondary mt-1 mb-6">
        Ask questions across every verified document you have access to. Answers are retrieval-grounded
        and cite their sources — this is not a substitute for legal judgment.
      </p>
      <div className="flex-1 min-h-0">
        <AIQueryPanel />
      </div>
    </div>
  );
}
