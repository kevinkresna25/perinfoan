import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const members = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/members' }),
  schema: z.object({
    name: z.string(),
    nickname: z.string().optional(),
    role: z.string(),
    avatar: z.string(),
    bio: z.string().optional(),
    skills: z.array(z.string()).default([]),
    socials: z
      .object({
        github: z.string().optional(),
        linkedin: z.string().optional(),
        instagram: z.string().optional(),
        website: z.string().optional(),
      })
      .default({}),
    order: z.number().default(99),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['live', 'in-development', 'planned']).default('in-development'),
    subdomain: z.string(),
    url: z.string().url().optional(),
    techStack: z.array(z.string()).default([]),
    contributors: z.array(z.string()).default([]),
    category: z.string().default('Experiment'),
    order: z.number().default(99),
  }),
});

export const collections = { members, projects };
