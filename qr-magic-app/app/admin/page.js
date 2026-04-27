'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// ▼ URLは入力済みです。ANON_KEYのところだけ、あなたの長いキーに書き換えてください ▼
const supabase = createClient(
  'https://lnuhablmbxwajeudrklr.supabase.co', 
  'sb_publishable_Kbj7CQKrzNZpMCcvDbckFA__Wgp6VuS'
);

export default function Admin() {
  const [selectedId, setSelectedId] = useState('001');
  const [card, setCard] = useState({ suit: 'spade', number: '1' });

  const updateCard = async (isLocked = false) => {
    await supabase
      .from('qr_states')
      .update({ ...card, is_locked: isLocked, updated_at: new Date() })
      .eq('id', selectedId);
    alert(isLocked ? '永続化ロックしました' : '送信しました');
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Magic Controller</h1>
      <select onChange={(e) => setSelectedId(e.target.value)}>
        <option value="001">QR-001</option>
        <option value="002">QR-002</option>
      </select>
      
      <div style={{ margin: '20px 0' }}>
        {['spade', 'heart', 'diamond', 'club'].map(s => (
          <button key={s} onClick={() => setCard({...card, suit: s})} 
            style={{ border: card.suit === s ? '2px solid blue' : '1px solid gray', padding: '10px', margin: '5px' }}>{s}</button>
        ))}
      </div>
      
      <input type="number" min="1" max="13" value={card.number} 
        onChange={(e) => setCard({...card, number: e.target.value})} style={{ padding: '10px', fontSize: '16px' }} />
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => updateCard(false)} style={{ padding: '10px 20px' }}>通常送信</button>
        <button onClick={() => updateCard(true)} style={{ marginLeft: '10px', padding: '10px 20px', background: '#ffcccc' }}>永続化ロック</button>
      </div>
    </div>
  );
}