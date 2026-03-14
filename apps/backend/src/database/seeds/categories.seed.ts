import { DataSource } from 'typeorm';
import { Category } from '../../entities/category.entity';

export async function seedCategories(dataSource: DataSource) {
  const repo = dataSource.getRepository(Category);
  const categories = [
    { name: 'AI/ML', slug: 'ai-ml' },
    { name: 'SaaS', slug: 'saas' },
    { name: '개발툴', slug: 'devtools' },
    { name: '핀테크', slug: 'fintech' },
    { name: '마케팅', slug: 'marketing' },
    { name: '커머스', slug: 'commerce' },
    { name: '기타', slug: 'etc' },
  ];
  for (const cat of categories) {
    const exists = await repo.findOneBy({ slug: cat.slug });
    if (!exists) await repo.save(repo.create(cat));
  }
}
