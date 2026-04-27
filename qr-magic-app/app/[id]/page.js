'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// ▼ ここもANON_KEYのところだけ、あなたの長いキーに書き換えてください ▼
const supabase = createClient(
  'https://lnuhablmbxwajeudrklr.supabase.co', 
  'sb_publishable_Kbj7CQKrzNZpMCcvDbckFA__Wgp6VuS'
);

export default function Viewer({ params }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'qr_states' }, 
        (payload) => { if(payload.new.id === params.id) setData(payload.new); }
      )
      .subscribe();

    const fetchData = async () => {
      const { data } = await supabase.from('qr_states').select('*').eq('id', params.id).single();
      setData(data);
      
      if (data && data.suit && !data.is_locked) {
        setTimeout(async () => {
          await supabase.from('qr_states').update({ suit: '', number: '' }).eq('id', params.id);
        }, 3000);
      }
    };
    fetchData();
    return () => supabase.removeChannel(channel);
  }, [params.id]);

  if (!data || !data.suit) return <div style={{ textAlign: 'center', marginTop: '100px' }}>お待ちください...</div>;

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h2>Your Card is...</h2>
      <div style={{ fontSize: '100px' }}>
        {data.suit === 'spade' ? '♠️' : data.suit === 'heart' ? '♥️' : data.suit === 'diamond' ? '♦️' : '♣️'}
        {data.number}
      </div>
    </div>
  );
}