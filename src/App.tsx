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
  notes?: string;
  created_at: string;
  status: string;
};

const STATUS_STEPS = ["出品準備中", "出品中", "発送準備中", "発送済み", "受け取り済み"];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [newPrice, setNewPrice] = useState<number | "">("");
  const [newShipping, setNewShipping] = useState<number | "">("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

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
      .order('created_at', { ascending: false }); // 新しい順にソート
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
        notes: newNotes,
        user_id: user.id,
        status: STATUS_STEPS[0] // 初期ステータス
      }])
      .select(); // 追加したデータを取得するように変更

    if (error) console.error("追加エラー:", error.message);

    if (!error && data) {
      setNewName("");
      setNewPrice("");
      setNewShipping("");
      setNewNotes("");

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

  const updateItem = async () => {
    if (!editingItem) return;
    const { error } = await supabase
      .from('items')
      .update({
        name: editingItem.name,
        price: editingItem.price,
        shipping: editingItem.shipping,
        notes: editingItem.notes,
        status: editingItem.status
      })
      .eq('id', editingItem.id);

    if (!error) {
      setEditingItem(null);
      fetchItems();
    } else {
      console.error("更新エラー:", error.message);
    }
  };

  const updateStatus = async (item: Item, direction: 'next' | 'prev') => {
    const currentIndex = STATUS_STEPS.indexOf(item.status);
    let nextIndex = currentIndex;

    if (direction === 'next' && currentIndex < STATUS_STEPS.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (direction === 'prev' && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    }

    if (nextIndex === currentIndex) return;

    const nextStatus = STATUS_STEPS[nextIndex];
    const { error } = await supabase
      .from('items')
      .update({ status: nextStatus })
      .eq('id', item.id);

    if (!error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i));
    } else {
      console.error("ステータス更新エラー:", error.message);
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

  const displayItems = items.filter(item => {
    const isCompleted = item.status === "受け取り済み";
    return activeTab === "active" ? !isCompleted : isCompleted;
  });

  return (
    <div className="app-container" style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 15px", minHeight: "100vh" }}>
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

            <div className="input-group" style={{ marginBottom: "20px" }}>
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

            <div className="input-group" style={{ marginBottom: "25px" }}>
              <label style={{ fontSize: "1rem", fontWeight: "bold" }}>備考</label>
              <textarea
                placeholder="仕入れ先や状態など"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "1rem", minHeight: "80px", boxSizing: "border-box" }}
              />
            </div>

            <button type="submit" style={{ padding: "15px", fontSize: "1.1rem", fontWeight: "bold" }}>在庫に追加する</button>
          </form>
          <div style={{ border: "1px solid #eee", padding: "20px", borderRadius: "12px", flex: "2", minWidth: "280px", backgroundColor: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.5rem", margin: 0 }}>在庫一覧</h2>
              <div className="tabs-container" style={{ display: "flex", gap: "10px", backgroundColor: "#f0f0f0", padding: "4px", borderRadius: "10px" }}>
                <button 
                  onClick={() => setActiveTab('active')}
                  style={{ padding: "8px 16px", fontSize: "0.85rem", borderRadius: "8px", border: "none", cursor: "pointer", width: "auto", margin: 0, backgroundColor: activeTab === 'active' ? "#fff" : "transparent", color: activeTab === 'active' ? "#ff333f" : "#666", boxShadow: activeTab === 'active' ? "0 2px 5px rgba(0,0,0,0.1)" : "none" }}
                >進行中</button>
                <button 
                  onClick={() => setActiveTab('completed')}
                  style={{ padding: "8px 16px", fontSize: "0.85rem", borderRadius: "8px", border: "none", cursor: "pointer", width: "auto", margin: 0, backgroundColor: activeTab === 'completed' ? "#fff" : "transparent", color: activeTab === 'completed' ? "#ff333f" : "#666", boxShadow: activeTab === 'completed' ? "0 2px 5px rgba(0,0,0,0.1)" : "none" }}
                >完了履歴</button>
              </div>
            </div>
            <div>
              {displayItems.map((item) => {
                const commission = Math.floor(item.price * 0.1);
                const profit = item.price - commission - item.shipping;
                const profitColor = profit <= 0 ? "#ff333f" : "#2ecc71";

                if (editingItem?.id === item.id) {
                  return (
                    <div key={item.id} className="item-card" style={{ padding: "20px", marginBottom: "15px", border: "2px solid #ff333f" }}>
                      <input 
                        value={editingItem.name} 
                        onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                        style={{ marginBottom: "10px" }}
                      />
                      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                        <input 
                          type="number" 
                          value={editingItem.price} 
                          onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})}
                          placeholder="価格"
                        />
                        <input 
                          type="number" 
                          value={editingItem.shipping} 
                          onChange={e => setEditingItem({...editingItem, shipping: Number(e.target.value)})}
                          placeholder="送料"
                        />
                      </div>
                      <select 
                        value={editingItem.status} 
                        onChange={e => setEditingItem({...editingItem, status: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "10px", fontSize: "1rem" }}
                      >
                        {STATUS_STEPS.map(step => (
                          <option key={step} value={step}>{step}</option>
                        ))}
                      </select>
                      <textarea 
                        value={editingItem.notes || ""} 
                        onChange={e => setEditingItem({...editingItem, notes: e.target.value})}
                        placeholder="備考"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "10px" }}
                      />
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={updateItem} style={{ backgroundColor: "#2ecc71" }}>保存</button>
                        <button onClick={() => setEditingItem(null)} style={{ backgroundColor: "#999" }}>キャンセル</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="item-card" style={{ padding: "20px", marginBottom: "15px", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span className={`status-badge status-${STATUS_STEPS.indexOf(item.status)}`}>{item.status}</span>
                        <div className="item-name" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{item.name}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          onClick={() => setEditingItem(item)} 
                          style={{ backgroundColor: "#f0f0f0", color: "#333", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", width: "auto" }}
                        >
                          編集
                        </button>
                        <button 
                          onClick={() => deleteItem(item.id)} 
                          style={{ backgroundColor: "#ff4d4f", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", width: "auto" }}
                        >
                          削除
                        </button>
                      </div>
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

                    {item.notes && (
                      <div style={{ fontSize: "0.85rem", color: "#555", marginTop: "12px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "8px", whiteSpace: "pre-wrap" }}>
                        <strong>備考:</strong><br />{item.notes}
                      </div>
                    )}

                    <div className="status-controls">
                      {item.status === "受け取り済み" ? (
                        <div className="completed-label">取引完了</div>
                      ) : (
                        <>
                          {STATUS_STEPS.indexOf(item.status) > 0 && (
                            <button 
                              onClick={() => updateStatus(item, 'prev')}
                              className="status-button prev"
                            >
                              ← 戻す
                            </button>
                          )}
                          <button 
                            onClick={() => updateStatus(item, 'next')}
                            className="status-button next"
                          >
                            次へ：{STATUS_STEPS[STATUS_STEPS.indexOf(item.status) + 1]} →
                          </button>
                        </>
                    )}
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