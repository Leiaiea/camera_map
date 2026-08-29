interface GuidePageProps { onStart: () => void; onCancel: () => void }

const suggestions = [
  '日落前后，天空的颜色怎么变',
  '一株你以前没有注意过的植物',
  '光落在水面上的样子',
];

export function GuidePage({ onStart, onCancel }: GuidePageProps) {
  return (
    <main className="page guide-page">
      <header className="simple-topbar"><button onClick={onCancel}>←</button><i /><i /></header>
      <section className="guide-hero"><p>不必寻找著名的地点。记录那些只有你刚好看见的变化。</p></section>
      <section className="suggestion-list">
        {suggestions.map((item, index) => <article key={item}><i>{String(index + 1).padStart(2, '0')}</i><p>{item}</p><span>↗</span></article>)}
      </section>
      <button className="primary-bottom-button" onClick={onStart}>开始记录 <span>→</span></button>
    </main>
  );
}
