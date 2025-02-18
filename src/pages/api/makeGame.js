import prisma from '../../lib/prisma';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { currentId, game, theme, cards } = req.body;
        console.log(`data: ${currentId} ${game} ${theme} ${cards}`);

        if (!currentId || !game || !Array.isArray(cards)) {
            return res.status(400).json({ error: "無効なリクエスト" });
        }

        const history = await prisma.history.create({
            data: {
                userId: currentId,
                game,
                theme: theme || "テーマ未設定",
                contents: {
                    create: cards.map((cardContent, index) => ({
                        content: cardContent,
                        order: index,
                    })),
                },
            },
            include: {
                contents: true,
            },
        });

        return res.status(200).json({ success: true, history });
    } catch (error) {
        console.error("ゲーム履歴の登録エラー:", error);
        return res.status(500).json({ error: "サーバーエラー" });
    }
}
