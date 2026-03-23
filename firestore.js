// Vercel Serverless Function
// Firebase Admin SDK を使ってサーバー側でFirestoreにアクセスする
// これによりAPIキーがブラウザに露出しない

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Firebase Admin 初期化（環境変数から認証情報を取得）
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'amber--nexus'
  });
}
const db = getFirestore();

module.exports = async function handler(req, res) {
  // CORS設定（あなたのドメインからのみ許可）
  res.setHeader('Access-Control-Allow-Origin', '*'); // 後でドメイン制限推奨
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: データ読み込み
    if (req.method === 'GET') {
      const docId = req.query.doc || 'page1-visual';
      const snap = await db.collection('tasting_sessions').doc(docId).get();
      if (!snap.exists) {
        return res.status(200).json({ exists: false, data: null });
      }
      return res.status(200).json({ exists: true, data: snap.data() });
    }

    // POST: データ保存
    if (req.method === 'POST') {
      const { docId, data, merge } = req.body;
      if (!docId || !data) {
        return res.status(400).json({ error: 'docId and data are required' });
      }

      // 許可するフィールドだけ通す（セキュリティ）
      const allowed = ['tags', 'selectedColor', 'selectedGlass', 'sliders'];
      const filtered = {};
      for (const key of allowed) {
        if (data[key] !== undefined) {
          filtered[key] = data[key];
        }
      }
      filtered.updatedAt = FieldValue.serverTimestamp();

      if (merge) {
        await db.collection('tasting_sessions').doc(docId).set(filtered, { merge: true });
      } else {
        await db.collection('tasting_sessions').doc(docId).set(filtered);
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('Firestore API error:', e);
    return res.status(500).json({ error: e.message });
  }
};
