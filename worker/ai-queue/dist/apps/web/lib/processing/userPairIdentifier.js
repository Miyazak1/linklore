import { prisma } from '@/lib/db/client';
/**
 * 识别话题中所有参与讨论的用户对
 * 基于文档树结构，找出有直接回复关系的用户对
 *
 * 规则：
 * 1. 直接回复关系：A回复B → A和B形成用户对
 * 2. 多轮讨论：A和B多次互相回复 → 合并为同一个用户对，记录所有讨论路径
 * 3. 不包含间接关系：A回复B，C回复A → 只识别A-B和A-C，不识别B-C（除非B直接回复C）
 */
export async function identifyUserPairs(topicId) {
    // 1. 获取所有文档（包含作者信息和创建时间）
    const docs = await prisma.document.findMany({
        where: { topicId },
        select: {
            id: true,
            parentId: true,
            authorId: true,
            createdAt: true
        }
    });
    // 2. 构建文档映射
    const docMap = new Map(docs.map(d => [d.id, d]));
    // 3. 找出话题的真正原始文档（第一个创建的parentId为null的文档）
    // 按创建时间排序，第一个parentId为null的文档是话题的原始文档
    const sortedDocs = [...docs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const trueOriginalDoc = sortedDocs.find(d => !d.parentId);
    // 4. 识别用户对（基于直接回复关系）
    const userPairs = new Map();
    docs.forEach(doc => {
        // 处理有父节点的文档（回复文档）
        if (doc.parentId) {
            const parent = docMap.get(doc.parentId);
            if (parent && parent.authorId !== doc.authorId) {
                // 两个不同用户之间的回复关系
                const [userId1, userId2] = doc.authorId < parent.authorId
                    ? [doc.authorId, parent.authorId]
                    : [parent.authorId, doc.authorId];
                const pairKey = `${userId1}:${userId2}`;
                if (!userPairs.has(pairKey)) {
                    userPairs.set(pairKey, {
                        userId1,
                        userId2,
                        docIds: new Set(),
                        discussionPaths: []
                    });
                }
                const pair = userPairs.get(pairKey);
                pair.docIds.add(doc.id);
                pair.docIds.add(parent.id);
                // 确定讨论方向
                const direction = doc.authorId === userId1 ? 'user1->user2' : 'user2->user1';
                // 计算深度（从根节点到当前节点的深度）
                let depth = 0;
                let currentId = doc.id;
                while (currentId) {
                    const currentDoc = docMap.get(currentId);
                    if (!currentDoc || !currentDoc.parentId)
                        break;
                    depth++;
                    currentId = currentDoc.parentId;
                }
                pair.discussionPaths.push({
                    path: [parent.id, doc.id],
                    depth,
                    direction
                });
            }
        }
        else {
            // 处理parentId为null的文档
            if (trueOriginalDoc && doc.id === trueOriginalDoc.id) {
                // 这是话题的真正原始文档：查找所有直接回复这个文档的文档
                const repliesToOriginal = docs.filter(d => d.parentId === doc.id && d.authorId !== doc.authorId);
                repliesToOriginal.forEach(reply => {
                    const [userId1, userId2] = doc.authorId < reply.authorId
                        ? [doc.authorId, reply.authorId]
                        : [reply.authorId, doc.authorId];
                    const pairKey = `${userId1}:${userId2}`;
                    if (!userPairs.has(pairKey)) {
                        userPairs.set(pairKey, {
                            userId1,
                            userId2,
                            docIds: new Set(),
                            discussionPaths: []
                        });
                    }
                    const pair = userPairs.get(pairKey);
                    pair.docIds.add(doc.id);
                    pair.docIds.add(reply.id);
                    // 确定讨论方向
                    const direction = reply.authorId === userId1 ? 'user1->user2' : 'user2->user1';
                    pair.discussionPaths.push({
                        path: [doc.id, reply.id],
                        depth: 1, // 直接回复话题，深度为1
                        direction
                    });
                });
            }
            else if (trueOriginalDoc && doc.id !== trueOriginalDoc.id) {
                // 这是其他parentId为null的文档（可能是数据错误，应该被视为直接回复话题）
                // 将其视为直接回复话题的原始文档
                if (doc.authorId !== trueOriginalDoc.authorId) {
                    const [userId1, userId2] = trueOriginalDoc.authorId < doc.authorId
                        ? [trueOriginalDoc.authorId, doc.authorId]
                        : [doc.authorId, trueOriginalDoc.authorId];
                    const pairKey = `${userId1}:${userId2}`;
                    if (!userPairs.has(pairKey)) {
                        userPairs.set(pairKey, {
                            userId1,
                            userId2,
                            docIds: new Set(),
                            discussionPaths: []
                        });
                    }
                    const pair = userPairs.get(pairKey);
                    pair.docIds.add(trueOriginalDoc.id);
                    pair.docIds.add(doc.id);
                    // 确定讨论方向
                    const direction = doc.authorId === userId1 ? 'user1->user2' : 'user2->user1';
                    pair.discussionPaths.push({
                        path: [trueOriginalDoc.id, doc.id],
                        depth: 1, // 直接回复话题，深度为1
                        direction
                    });
                }
            }
        }
    });
    return Array.from(userPairs.values()).map(pair => ({
        userId1: pair.userId1,
        userId2: pair.userId2,
        docIds: Array.from(pair.docIds),
        discussionPaths: pair.discussionPaths
    }));
}
/**
 * 获取用户对在话题中的所有讨论文档
 */
export async function getUserPairDocuments(topicId, userId1, userId2) {
    // 获取话题的所有文档，以便找出真正的原始文档
    const allDocs = await prisma.document.findMany({
        where: { topicId },
        select: {
            id: true,
            authorId: true,
            parentId: true,
            createdAt: true
        }
    });
    // 找出话题的真正原始文档（第一个创建的parentId为null的文档）
    const sortedAllDocs = [...allDocs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const trueOriginalDoc = sortedAllDocs.find(d => !d.parentId);
    // 获取属于这两个用户的文档
    const userDocs = allDocs.filter(d => d.authorId === userId1 || d.authorId === userId2);
    // 过滤：只保留与另一个用户有直接回复关系的文档
    const docMap = new Map(userDocs.map(d => [d.id, d]));
    const relevantDocs = [];
    userDocs.forEach(doc => {
        if (doc.parentId) {
            // 处理回复文档：如果父文档是另一个用户创建的，则形成用户对
            const parent = docMap.get(doc.parentId);
            if (parent &&
                ((doc.authorId === userId1 && parent.authorId === userId2) ||
                    (doc.authorId === userId2 && parent.authorId === userId1))) {
                relevantDocs.push(doc);
                // 也包含父文档
                if (!relevantDocs.find(d => d.id === parent.id)) {
                    relevantDocs.push(parent);
                }
            }
        }
        else {
            // 处理parentId为null的文档
            if (trueOriginalDoc && doc.id === trueOriginalDoc.id) {
                // 这是话题的真正原始文档：如果另一个用户直接回复了这个文档，也应该包含
                // 查找所有直接回复这个原始文档的文档
                const repliesToOriginal = userDocs.filter(d => d.parentId === doc.id &&
                    d.authorId !== doc.authorId &&
                    (d.authorId === userId1 || d.authorId === userId2));
                if (repliesToOriginal.length > 0) {
                    // 包含原始文档
                    if (!relevantDocs.find(d => d.id === doc.id)) {
                        relevantDocs.push(doc);
                    }
                    // 包含所有回复文档
                    repliesToOriginal.forEach(reply => {
                        if (!relevantDocs.find(d => d.id === reply.id)) {
                            relevantDocs.push(reply);
                        }
                    });
                }
            }
            else if (trueOriginalDoc && doc.id !== trueOriginalDoc.id) {
                // 这是其他parentId为null的文档（可能是数据错误），视为直接回复话题的原始文档
                // 如果话题原始文档的作者是另一个用户，则形成用户对
                if ((doc.authorId === userId1 && trueOriginalDoc.authorId === userId2) ||
                    (doc.authorId === userId2 && trueOriginalDoc.authorId === userId1)) {
                    // 包含这个文档
                    if (!relevantDocs.find(d => d.id === doc.id)) {
                        relevantDocs.push(doc);
                    }
                    // 包含话题原始文档
                    if (!relevantDocs.find(d => d.id === trueOriginalDoc.id)) {
                        relevantDocs.push(trueOriginalDoc);
                    }
                }
            }
        }
    });
    return relevantDocs;
}
