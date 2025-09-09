export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <main className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-balance">
          LT Document Maker
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          ライトニングトーク資料作成ツール
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✅ Next.js 15.5.2 + TypeScript + TailwindCSS セットアップ完了
        </div>
      </main>
    </div>
  )
}