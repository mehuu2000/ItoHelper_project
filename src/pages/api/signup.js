import prisma from '../../lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log("サインアップをバックエンドで開始します");
    const { name, password } = req.body;

    if (!name) {
      return res.status(400).json({ error: '名前は必須です' });
    }

    try {
      // 名前が既に存在するかを確認
      const existingUser = await prisma.user.findUnique({
        where: { name },
      });

      // ユーザーが既に存在する場合
      if (existingUser) {
        return res.status(400).json({ error: 'この名前は既に使われています' });
      }

      // パスワードがある場合、ハッシュ化して保存
      console.log("ユーザーを作成します");
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
          data: {
            name,
            hashPassword: hashedPassword,
          },
        });
        return res.status(201).json({ message: 'ユーザーが作成されました', user: newUser });
      } else {
        // パスワードがない場合、名前だけでユーザーを作成
        const newUser = await prisma.user.create({
          data: {
            name,
          },
        });
        return res.status(201).json({ message: 'ユーザーが作成されました', user: newUser });
      }
    } catch (error) {
      console.error('サインアップエラー: ', error);
      return res.status(500).json({ error: 'サーバーエラー' });
    }
  } else {
    // POST 以外のリクエストを拒否
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
