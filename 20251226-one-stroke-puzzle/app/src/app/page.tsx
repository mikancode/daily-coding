'use client';

import Image from "next/image";
import GameBoard from "@/components/game/GameBoard";
import { useGameStore } from "@/store/useGameStore";

export default function Home() {
  const isGameActive = useGameStore((state) => state.isGameActive);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-4 font-sans text-white">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-400">One-Stroke Grid Puzzle</h1>
      </header>
      
      <main className="flex flex-col items-center gap-8 w-full max-w-3xl">
        {/* ゲームボードの表示 */}
        <GameBoard />
        
        {/* ステータス表示 (MVPではゲーム中のみ表示) */}
        {isGameActive && (
          <div className="text-center mt-4">
            <p className="text-lg text-gray-300">Start at S, reach G by visiting every cell once.</p>
            <p className="text-sm text-gray-500">(Drag or Click to draw path)</p>
          </div>
        )}
      </main>
      
      <footer className="mt-12 text-sm text-gray-500">
        <p>Phase 1: MVP Development</p>
      </footer>
    </div>
  );
}
