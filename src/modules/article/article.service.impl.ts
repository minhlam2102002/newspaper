import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Article } from 'src/entity/article.entity';
import { ArticleStatus } from 'src/enum/ArticleStatus.enum';
import { Repository } from 'typeorm';
import { SearchParms } from '../app/dto/SearchQuery';
import { Page } from '../app/dto/Page';
import slugify from 'slugify';
import { ArticleServiceInterface } from './article.service';
import { Comment } from 'src/entity/comment.entity';

@Injectable()
export class ArticleService implements ArticleServiceInterface {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}
  findAll(): Promise<Article[]> {
    return this.articleRepository.find({
      relations: ['category', 'labels', 'publishedBy', 'createdBy'],
    });
  }
  async create(dto: Article): Promise<Article> {
    dto.slug = slugify(dto.title, { lower: true }) + '-' + Date.now();
    dto.status = ArticleStatus.Pending;
    dto.publishedAt = new Date();
    return this.articleRepository.save(dto);
  }
  async update(id: number, dto: Article): Promise<Article | null> {
    dto.slug = slugify(dto.title, { lower: true }) + '-' + Date.now();
    const entity = await this.articleRepository.findOneBy({ id });
    if (!entity) return null;
    Object.assign(entity, dto);
    return this.articleRepository.save(entity);
  }
  remove(id: number) {
    this.articleRepository.delete(id);
  }
  async getArticlesByCategoryId(categoryId: number): Promise<Article[]> {
    return this.articleRepository.find({
      where: {
        category: {
          id: categoryId,
        },
        status: ArticleStatus.Published,
      },
      order: {
        publishedAt: 'DESC',
      },
    });
  }
  getLatestByCategory(categoryId: number, take = 10): Promise<Article[]> {
    return this.articleRepository.find({
      where: {
        category: {
          id: categoryId,
        },
        status: ArticleStatus.Published,
      },
      order: {
        publishedAt: 'DESC',
      },
      take,
    });
  }
  getMostViewedByCategory(categoryId: number, take = 10): Promise<Article[]> {
    return this.articleRepository.find({
      where: {
        category: {
          id: categoryId,
        },
        status: ArticleStatus.Published,
      },
      order: {
        viewCount: 'DESC',
      },
      take,
    });
  }
  async getArticleBySlug(slug: string): Promise<Article | null> {
    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: ['createdBy', 'category', 'labels'],
    });
    if (article) {
      article.viewCount++;
      article.weeklyViewCount++;
      await this.articleRepository.save(article);
    }
    return article;
  }
  async getWeeklyArticles(take = 4): Promise<Article[]> {
    return this.articleRepository.find({
      relations: ['createdBy', 'publishedBy'],
      where: {
        status: ArticleStatus.Published,
      },
      order: {
        weeklyViewCount: 'DESC',
      },
      take,
    });
  }
  async searchArticles(searchQuery: SearchParms): Promise<Page<Article>> {
    const {
      page,
      pageSize,
      label,
      category,
      query,
      time,
      field,
      createdBy,
      status,
    } = searchQuery;
    const queryBuilder = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.labels', 'label');

    if (createdBy) {
      queryBuilder.andWhere('article.createdBy = :createdBy', { createdBy });
    }

    if (status != 'all') {
      queryBuilder.andWhere('article.status = :status', { status });
    }

    if (query.length > 0) {
      if (field === 'all') {
        queryBuilder.andWhere('article.textSearch @@ to_tsquery(:query)', {
          query,
        });
      }
      if (field === 'title') {
        queryBuilder.andWhere('article.title ILIKE :query', {
          query: `%${query}%`,
        });
      }
      if (field === 'body') {
        queryBuilder.andWhere('article.body ILIKE :query', {
          query: `%${query}%`,
        });
      }
      if (field === 'abstract') {
        queryBuilder.andWhere('article.abstract ILIKE :query', {
          query: `%${query}%`,
        });
      }
    }

    if (category.length > 0)
      queryBuilder.andWhere('category.name = :category', { category });

    if (label.length > 0)
      queryBuilder.andWhere('label.name = :label', { label });

    if (time === 'day') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      queryBuilder.andWhere('article.publishedAt >= :today', { today });
    } else if (time === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      queryBuilder.andWhere('article.publishedAt >= :oneWeekAgo', {
        oneWeekAgo,
      });
    } else if (time === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      queryBuilder.andWhere('article.publishedAt >= :oneMonthAgo', {
        oneMonthAgo,
      });
    }
    queryBuilder.orderBy('article.isPremium', 'DESC');

    const [articles, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      content: articles,
      totalPage: Math.ceil(total / pageSize),
      page,
      pageSize,
    };
  }
  aprrove(id: number): Promise<Article | null> {
    return this.articleRepository.save({ id, status: ArticleStatus.Published });
  }
  reject(id: number): Promise<Article | null> {
    return this.articleRepository.save({ id, status: ArticleStatus.Rejected });
  }
  comment(articleId: number, dto: Comment): Promise<Article | null> {
    return this.articleRepository.save({
      id: articleId,
      comments: [dto],
    });
  }
}
