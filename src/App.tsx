import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css';
import type { User } from '@supabase/supabase-js';

type Item = {
  id: string;
  name: string;
  price: number;
  shipping: number;
  user_id: string;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [newPrice, setNewPrice] = useState<number | "">("");
  const [newShipping, setNewShipping] = useState<number | "">("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchItems();
    else setItems([]);
  }, [user]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
    if (error) console.error(error);
    else setItems(data || []);
  };

  const addItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // フォーム送信によるリロードを防止
    if (!user) return;
    if (!newName.trim()) return; // 商品名が空の場合は何もしない

    const { data, error } = await supabase
      .from('items')
      .insert([{
        name: newName,
        price: newPrice === "" ? 0 : newPrice,
        shipping: newShipping === "" ? 0 : newShipping,
        user_id: user.id  // ここがRLSで重要！
      }])
      .select(); // 追加したデータを取得するように変更

    if (error) console.error("追加エラー:", error.message);

    if (!error && data) {
      setNewName("");
      setNewPrice("");
      setNewShipping("");

      if (data.length > 0) {
        // サーバーから再取得せずに、現在の状態に直接追加（高速）
        setItems(prev => [data[0], ...prev]);
      } else {
        // データはあるはずなのに返ってこない場合はRLSのSELECTポリシーが原因
        console.warn("データは追加されましたが、取得できませんでした。RLSのSELECTポリシーを確認してください。");
        fetchItems();
      }
    }
  };

  const deleteItem = async (id: string) => {
    if (!user) return;
    if (!window.confirm("この商品を削除してもよろしいですか？")) return;

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (!error) fetchItems();
  };

  const login = () => supabase.auth.signInWithOAuth({ provider: 'google' });
  const logout = () => supabase.auth.signOut();

  return (
    <div className="app-container" style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 15px" }}>
      {!user ? (
        <div className='card' style={{ textAlign: "center", maxWidth: "500px", margin: "100px auto", padding: "40px" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "20px" }}>メルカリ在庫管理</h1>
          <p style={{ fontSize: "1.1rem", marginBottom: "30px" }}>在庫をクラウドに保存するにはログインしてください。</p>
          <button onClick={login} style={{ padding: "12px 24px", fontSize: "1.1rem" }}>Googleでログイン</button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
            <h1 style={{ fontSize: "2rem" }}>メルカリ在庫管理システム</h1>
            <button onClick={logout} style={{ width: "auto", padding: "10px 20px", fontSize: "0.9rem" }}>ログアウト</button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-start" }}>
            <form onSubmit={addItem} className="card" style={{ flex: "1", minWidth: "280px", padding: "20px", boxSizing: "border-box" }}>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>新規登録</h3>

            <div className="input-group" style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "1rem", fontWeight: "bold" }}>商品名</label>
              <input
                type="text"
                placeholder="例：スニーカー"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ padding: "12px", fontSize: "1rem" }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "1rem", fontWeight: "bold" }}>販売価格 (円)</label>
              <div className="input-with-unit" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span className="unit" style={{ fontSize: "1.1rem", position: "absolute", left: "12px", color: "#555" }}>¥</span>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ padding: "12px", paddingLeft: "40px", fontSize: "1rem", width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: "25px" }}>
              <label style={{ fontSize: "1rem", fontWeight: "bold" }}>送料 (円)</label>
              <div className="input-with-unit" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span className="unit" style={{ fontSize: "1.1rem", position: "absolute", left: "12px", color: "#555" }}>¥</span>
                <input
                  type="number"
                  value={newShipping}
                  onChange={(e) => setNewShipping(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ padding: "12px", paddingLeft: "40px", fontSize: "1rem", width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <button type="submit" style={{ padding: "15px", fontSize: "1.1rem", fontWeight: "bold" }}>在庫に追加する</button>
          </form>
          <div style={{ border: "1px solid #eee", padding: "20px", borderRadius: "12px", flex: "2", minWidth: "280px", backgroundColor: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", boxSizing: "border-box" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>在庫一覧</h2>
            <div>
              {items.map((item) => {
                const commission = Math.floor(item.price * 0.1);
                const profit = item.price - commission - item.shipping;
                const profitColor = profit <= 0 ? "#ff333f" : "#2ecc71";

                return (
                  <div key={item.id} className="item-card" style={{ padding: "20px", marginBottom: "15px", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div className="item-name" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{item.name}</div>
                      <button onClick={() => deleteItem(item.id)} style={{ backgroundColor: "#ff4d4f", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", width: "auto" }}>削除</button>
                    </div>

                    <div className="price-row">
                      <div>
                        <span className="label-small" style={{ fontSize: "0.9rem" }}>価格</span>
                        <span className="main-price" style={{ fontSize: "1.4rem" }}>¥{item.price.toLocaleString()}</span>
                      </div>

                      <div className="profit-display">
                        <span className="label-small" style={{ fontSize: "0.9rem" }}>利益</span>
                        <span className="profit-amount" style={{ color: profitColor, fontSize: "1.4rem", fontWeight: "bold" }}>
                          ¥{profit.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.9rem", color: "#777", textAlign: "left", marginTop: "8px" }}>
                      (内訳: 手数料 ¥{commission.toLocaleString()} / 送料 ¥{item.shipping.toLocaleString()})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;