import prisma from '../../lib/prisma';

export default async function handler(req, res) {
    if(req.method !== "GET") {
        return res.status(405).json({ error: "メソッドがGETではありません"});
    }

    try {
        const historys = await prisma.history.findMany({
            include: {
                contents: true,
            },
        });

        res.status(200).json(historys);
    } catch {
        console.error("履歴取得エラー: ", error);
        res.status(500).json({ error: "履歴の取得に失敗しました" });
    }
}