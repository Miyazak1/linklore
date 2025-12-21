import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import { enqueuePracticeAnalysis } from '@/lib/queue/jobs';
import { validatePracticeReality } from '@/lib/practices/reality-validator';
import { calculateCompositeScore } from '@/lib/practices/sorting';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['depth', 'latest', 'hot']).default('depth'),
  tag: z.string().nullish(),
  region: z.string().nullish(),
  practiceType: z.string().nullish(),
  search: z.string().nullish(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const params = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sort: searchParams.get('sort'),
      tag: searchParams.get('tag'),
      region: searchParams.get('region'),
      practiceType: searchParams.get('practiceType'),
      search: searchParams.get('search'),
    });

    const skip = (params.page - 1) * params.limit;

    // 构建查询条件
    const where: any = {
      status: 'published',
    };

    if (params.tag) {
      where.tags = {
        some: {
          tag: {
            name: params.tag,
          },
        },
      };
    }

    if (params.region) {
      where.region = params.region;
    }

    if (params.practiceType) {
      where.practiceType = params.practiceType;
    }

    // 如果有搜索条件，需要将 status 和 OR 组合在 AND 中
    if (params.search) {
      const baseConditions: any = {
        status: 'published',
      };
      
      if (params.tag) {
        baseConditions.tags = {
          some: {
            tag: {
              name: params.tag,
            },
          },
        };
      }
      
      if (params.region) {
        baseConditions.region = params.region;
      }
      
      if (params.practiceType) {
        baseConditions.practiceType = params.practiceType;
      }

      // 重新构建 where 对象，使用 AND 组合所有条件
      where.AND = [
        baseConditions,
        {
          OR: [
            { title: { contains: params.search, mode: 'insensitive' } },
            { content: { contains: params.search, mode: 'insensitive' } },
            { summary: { contains: params.search, mode: 'insensitive' } },
          ],
        },
      ];
      // 删除原来的 status，因为已经在 AND 中的 baseConditions 里了
      delete where.status;
      // 删除其他已经在 baseConditions 中的条件
      if (params.tag) delete where.tags;
      if (params.region) delete where.region;
      if (params.practiceType) delete where.practiceType;
    }

    // 构建排序
    let orderBy: any;
    if (params.sort === 'depth') {
      orderBy = { compositeScore: 'desc' };
    } else if (params.sort === 'latest') {
      orderBy = { createdAt: 'desc' };
    } else if (params.sort === 'hot') {
      // 热度 = 点赞数 + 评论数 * 2（时间衰减）
      // 这里简化处理，实际可以计算综合热度分数
      orderBy = { createdAt: 'desc' };
    } else {
      // 默认排序
      orderBy = { createdAt: 'desc' };
    }

    // 查询实践记录（优化：减少数据量，提升性能）
    let practices, total;
    let practiceIds: string[];
    let likeCountMap: Map<string, number>;
    let commentCountMap: Map<string, number>;
    let bookmarkCountMap: Map<string, number>;
    
    try {
      [practices, total] = await Promise.all([
        prisma.practice.findMany({
          where,
          skip,
          take: params.limit,
          orderBy,
          select: {
            id: true,
            title: true,
            summary: true,
            // 列表页只需要内容预览，使用 Prisma 的 select 无法截断字符串
            // 但我们可以只选择 content 字段，然后在返回时截断
            // 或者使用数据库函数截断（如果数据库支持）
            // 为了性能，我们先不选择 content，只使用 summary
            // 如果 summary 为空，前端可以显示"点击查看详情"
            practiceType: true,
            region: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            tags: {
              take: 5, // 限制标签数量，提升性能
              select: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            mediaFiles: {
              take: 1, // 只取第一张图片
              orderBy: { order: 'asc' },
              select: {
                id: true,
                fileKey: true,
                thumbnailKey: true,
              },
            },
            // 使用单独的聚合查询替代 _count，提升性能
            // _count 在大量数据时很慢
          },
        }),
        prisma.practice.count({ where }),
      ]);
      
      // 如果没有数据，直接返回
      if (practices.length === 0) {
        return NextResponse.json({
          practices: [],
          pagination: {
            page: params.page,
            limit: params.limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
      
      // 批量获取统计数据（优化：使用单独的查询，可以并行执行）
      practiceIds = practices.map((p) => p.id);
      const [likeCounts, commentCounts, bookmarkCounts] = await Promise.all([
        // 使用 groupBy 批量获取点赞数
        prisma.practiceLike.groupBy({
          by: ['practiceId'],
          where: { practiceId: { in: practiceIds } },
          _count: { practiceId: true },
        }),
        // 使用 groupBy 批量获取评论数
        prisma.practiceComment.groupBy({
          by: ['practiceId'],
          where: { practiceId: { in: practiceIds } },
          _count: { practiceId: true },
        }),
        // 使用 groupBy 批量获取收藏数
        prisma.practiceBookmark.groupBy({
          by: ['practiceId'],
          where: { practiceId: { in: practiceIds } },
          _count: { practiceId: true },
        }),
      ]);
      
      // 构建统计数据的 Map
      likeCountMap = new Map(likeCounts.map((item) => [item.practiceId, item._count.practiceId]));
      commentCountMap = new Map(commentCounts.map((item) => [item.practiceId, item._count.practiceId]));
      bookmarkCountMap = new Map(bookmarkCounts.map((item) => [item.practiceId, item._count.practiceId]));
    } catch (dbError: any) {
      console.error('[GET /api/practices] Database error:', dbError);
      console.error('[GET /api/practices] Error message:', dbError.message);
      console.error('[GET /api/practices] Error code:', dbError.code);
      console.error('[GET /api/practices] Error meta:', JSON.stringify(dbError.meta, null, 2));
      throw dbError;
    }

    // 如果查询失败，practices 可能未定义，需要检查
    if (!practices || practices.length === 0) {
      return NextResponse.json({
        practices: [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // 检查用户是否点赞/收藏（优化：合并到一个查询中）
    // practiceIds 已在 try 块内定义，这里直接使用
    if (!practiceIds || practiceIds.length === 0) {
      // 如果 practiceIds 未定义，重新计算
      practiceIds = practices.map((p) => p.id);
    }
    
    const [userLikes, userBookmarks] = await Promise.all([
      prisma.practiceLike.findMany({
        where: {
          practiceId: { in: practiceIds },
          userId: session.sub,
        },
        select: { practiceId: true },
      }),
      prisma.practiceBookmark.findMany({
        where: {
          practiceId: { in: practiceIds },
          userId: session.sub,
        },
        select: { practiceId: true },
      }),
    ]);

    const likedSet = new Set(userLikes.map((l) => l.practiceId));
    const bookmarkedSet = new Set(userBookmarks.map((b) => b.practiceId));

    // 组装最终数据
    const practicesWithUserData = practices.map((practice) => ({
      ...practice,
      isLiked: likedSet.has(practice.id),
      isBookmarked: bookmarkedSet.has(practice.id),
      likeCount: likeCountMap.get(practice.id) || 0,
      commentCount: commentCountMap.get(practice.id) || 0,
      bookmarkCount: bookmarkCountMap.get(practice.id) || 0,
    }));

    // 添加缓存头（优化：允许客户端和 CDN 缓存）
    const response = NextResponse.json({
      practices: practicesWithUserData,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    });
    
    // 设置缓存：30秒（对于列表页，短时间缓存可以显著提升性能）
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return response;
  } catch (error: any) {
    console.error('[GET /api/practices] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch practices' },
      { status: 500 }
    );
  }
}

// 创建实践记录
const createSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1),
  recordMode: z.enum(['SIMPLE', 'STRUCTURED', 'AI_ASSISTED']),
  structuredData: z.record(z.any()).nullish(),
  practiceType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mediaFiles: z
    .array(
      z.object({
        fileKey: z.string(),
        mime: z.string(),
        size: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        thumbnailKey: z.string().optional(),
      })
    )
    .optional(),
  theoryReferences: z
    .array(
      z.object({
        theorist: z.string(),
        source: z.string().optional(),
        quote: z.string(),
        page: z.string().optional(),
        year: z.number().optional(),
        position: z.number().optional(),
      })
    )
    .optional(),
  materialResults: z
    .object({
      quantitative: z.string().optional(),
      qualitative: z.string().optional(),
      affectedPeople: z.number().optional(),
      affectedScope: z.string().optional(),
      duration: z.string().optional(),
      sustainability: z.string().optional(),
    })
    .optional(),
  objectRelation: z
    .object({
      targetObject: z.string().optional(),
      actionType: z.string().optional(),
      beforeState: z.string().optional(),
      afterState: z.string().optional(),
      changeEvidence: z.array(z.string()).optional(),
    })
    .optional(),
  status: z.enum(['published', 'draft']).default('published'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    // 计算初始综合分数（基于时间衰减，确保新创建的实践能显示）
    const now = new Date();
    const initialCompositeScore = calculateCompositeScore(
      0.5, // 初始深度分数（中等）
      0.5, // 初始密度分数（中等）
      now,
      0, // 初始点赞数
      0, // 初始评论数
      0.5, // 初始现实性分数（中等）
      false // 初始未验证
    );

    // 创建实践记录
    const practice = await prisma.practice.create({
      data: {
        authorId: session.sub,
        title: data.title,
        content: data.content,
        recordMode: data.recordMode,
        structuredData: data.structuredData,
        materialResults: data.materialResults as any,
        objectRelation: data.objectRelation as any,
        practiceType: data.practiceType as any,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
        publishedAt: data.status === 'published' ? now : null,
        depthScore: 0.5, // 初始深度分数
        densityScore: 0.5, // 初始密度分数
        compositeScore: initialCompositeScore, // 初始综合分数
        mediaFiles: data.mediaFiles
          ? {
              create: data.mediaFiles.map((m, idx) => ({
                ...m,
                order: idx,
              })),
            }
          : undefined,
        theoryReferences: data.theoryReferences
          ? {
              create: data.theoryReferences,
            }
          : undefined,
      },
    });

    // 处理标签
    if (data.tags && data.tags.length > 0) {
      // 查找或创建标签
      const tagOperations = await Promise.all(
        data.tags.map(async (tagName) => {
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: {
              name: tagName,
            },
          });
          return tag.id;
        })
      );

      // 关联标签
      await prisma.practiceTag.createMany({
        data: tagOperations.map((tagId) => ({
          practiceId: practice.id,
          tagId,
          isAuto: false,
        })),
        skipDuplicates: true,
      });
    }

    // 异步处理：现实性验证
    if (data.status === 'published') {
      // 异步验证实践的现实性
      validatePracticeReality(
        data.content,
        data.structuredData,
        data.mediaFiles?.length || 0,
        session.sub
      ).then(realityCheck => {
        // 更新实践记录的现实性检查结果
        prisma.practice.update({
          where: { id: practice.id },
          data: { realityCheck: realityCheck as any },
        }).catch(err => {
          console.error('[POST /api/practices] Failed to update reality check:', err);
        });
      }).catch(err => {
        console.error('[POST /api/practices] Failed to validate reality:', err);
      });

      // 异步处理：AI生成摘要和分析
      enqueuePracticeAnalysis(practice.id).catch(err => {
        console.error('[POST /api/practices] Failed to enqueue analysis:', err);
      });
    }

    return NextResponse.json({ practice }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/practices] Error:', error);
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return NextResponse.json({ 
        error: `验证失败: ${errorMessages}`,
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create practice' },
      { status: 500 }
    );
  }
}

