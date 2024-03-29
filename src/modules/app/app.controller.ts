import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Render,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as PDFDocument from 'pdfkit';
import * as sharp from 'sharp';
import axios from 'axios';
import { AppService } from './app.service';
import { SearchParms, SearchParamsType } from './dto/SearchQuery';
import { JwtInterceptor } from 'src/interceptors/JwtInterceptors';
import { User } from 'src/entity/user.entity';

@Controller()
@UseInterceptors(JwtInterceptor)
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  @Render('index')
  async homeView(@Req() req: Request) {
    const [categories, weeklyArticles, topArticles, topArticlesByCategory] =
      await Promise.all([
        this.appService.getCategories(),
        this.appService.getWeeklyArticles(),
        this.appService.getTopArticles(),
        this.appService.getTopArticlesByCategory(),
      ]);
    return {
      file: 'index',
      user: req.user,
      categories,
      weeklyArticles,
      topArticles,
      topArticlesByCategory,
    };
  }

  @Get('/search')
  @Render('search')
  async searchView(@Query() query: SearchParamsType, @Req() req: Request) {
    const isPremiumUser =
      (req.user as User)?.subcriptionExpiryDate > new Date();
    const searchParams = new SearchParms(query, isPremiumUser);
    const [categories, labels, articlesPage] = await Promise.all([
      this.appService.getCategories(),
      this.appService.getLabels(),
      this.appService.searchArticles(searchParams),
    ]);
    return {
      file: 'search',
      user: req.user,
      categories,
      labels,
      articles: articlesPage.content,
      totalPage: articlesPage.totalPage,
      searchParams,
    };
  }

  @Get('pdf/:slug')
  async pdfFile(@Param('slug') slug: string, @Res() res: Response) {
    const article = await this.appService.getArticleBySlug(slug);
    if (article === null) {
      throw new NotFoundException(`Article with slug ${slug} is not found!`);
    }
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${article.title}.pdf"`,
    });
    const pdf = new PDFDocument();
    pdf.pipe(res);
    pdf.text(article.title, {
      width: 410,
      align: 'center',
    });
    pdf.moveDown();
    if (article.bannerImageUrl) {
      const bannerImage = await axios.get(article.bannerImageUrl, {
        responseType: 'arraybuffer',
      });
      const bannerBuffer = Buffer.from(bannerImage.data, 'binary');
      const sharpedImage = await sharp(bannerBuffer).toFormat('png').toBuffer();
      pdf.image(sharpedImage, {
        cover: [160, 90],
        align: 'center',
      });
    }
    pdf.text(article.content, {
      width: 410,
      align: 'justify',
    });
    pdf.end();
  }

  @Get('article/:slug')
  @Render('article')
  async articleView(@Param('slug') slug: string, @Req() req: Request) {
    const [categories, article] = await Promise.all([
      this.appService.getCategories(),
      this.appService.getArticleBySlug(slug),
    ]);
    if (article === null) {
      throw new NotFoundException(`Article with slug ${slug} is not found!`);
    }
    if (article.isPremium && req.user !== undefined) {
      const user = req.user as User;
      if (user.subcriptionExpiryDate < new Date()) {
        return {
          file: 'payment',
          categories,
          user: req.user,
        };
      }
    }
    const relatedArticles = await this.appService.getRelatedArticles(article);
    return {
      file: 'article',
      categories,
      article,
      relatedArticles,
      user: req.user,
    };
  }

  @Get('/payment')
  @Render('payment')
  async paymentView(@Req() req: Request) {
    const [categories, labels] = await Promise.all([
      this.appService.getCategories(),
      this.appService.getLabels(),
    ]);
    return {
      file: 'payment',
      user: req.user,
      categories,
      labels,
    };
  }

  @Get('/admin')
  @Render('admin/admin')
  async adminView(@Req() req: Request) {
    const [categories, labels, articles, users] = await Promise.all([
      this.appService.getCategories(),
      this.appService.getLabels(),
      this.appService.getArticles(),
      this.appService.getUsers(),
    ]);

    return {
      file: 'admin/admin',
      user: req.user,
      categories: categories.map((category) => ({
        ...category,
        noEditor: category.editorCount,
        noNews: category.articleCount,
      })),
      articles,
      labels: labels.map((label) => ({
        ...label,
        noNews: label.articleCount,
      })),
      users,
    };
  }

  @Get('writer')
  @Render('writer/index')
  async writerView(@Req() req: Request) {
    const [categories, labels] = await Promise.all([
      this.appService.getCategories(),
      this.appService.getLabels(),
    ]);
    return {
      file: 'writer/index',
      user: req.user,
      categories,
      labels,
    };
  }

  @Get('writer/article/:slug')
  @Render('writer/index')
  async writerArticleView(@Req() req: Request, @Param('slug') slug: string) {
    const [categories, labels, article] = await Promise.all([
      this.appService.getCategories(),
      this.appService.getLabels(),
      this.appService.getArticleBySlug(slug),
    ]);

    return {
      file: 'writer/index',
      user: req.user,
      categories,
      labels,
      article,
    };
  }

  @Get('writer/search')
  @Render('writer/search')
  async writerSearchView(
    @Query() query: SearchParamsType,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    const [categories, labels, articlesPage] = await Promise.all([
      this.appService.getCategories(),
      this.appService.getLabels(),
      this.appService.searchArticles(
        new SearchParms({ ...query, createdBy: user.id }),
      ),
    ]);
    return {
      file: 'writer/search',
      user: req.user,
      categories,
      labels,
      articles: articlesPage.content,
      totalPage: articlesPage.totalPage,
      searchParams: new SearchParms(query),
    };
  }
}
