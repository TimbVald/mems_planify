import z from 'zod'
import {createTRPCRouter, protectedProcedure, publicProcedure, } from '../trpc'
import { pollCommits } from '~/lib/github';
import { indexGithubRepo } from '~/lib/github-loader';

export const projectRouter = createTRPCRouter({
    createProject: protectedProcedure.input(
        z.object({
            name: z.string(),
            githubUrl: z.string(),
            githubToken: z.string().optional()
        })
    ).mutation(async ({ctx, input}) => {
        // Vérifier si l'utilisateur existe dans la base de données
        const user = await ctx.db.user.findUnique({
            where: { id: ctx.user.userId! }
        });

        if (!user) {
            throw new Error("User not found in database. Please ensure you are properly registered.");
        }

        const project = await ctx.db.project.create({
            data: {
                name: input.name,
                githubUrl: input.githubUrl,
                UserToProjects: {
                    create: {
                        userId: ctx.user.userId!,
                    }
                }
            }
        })
        await indexGithubRepo(project.id, input.githubUrl, input.githubToken)
        await pollCommits(project.id)
        return project
    }),
    getProjects: protectedProcedure.query(async ({ctx}) => {
        return await ctx.db.project.findMany({
            where: {
                UserToProjects: {
                    some: { userId: ctx.user.userId! }
                },
                deleteAt: null
            }
        })
    }),
    getCommits: protectedProcedure.input(z.object({
        projectId: z.string()
    })).query(async ({ctx, input}) => {
        pollCommits(input.projectId).then().catch(console.error)
        return await ctx.db.commit.findMany({
            where: { projectId: input.projectId }
        })
    }),
    saveAnswer: protectedProcedure.input(z.object({
        projectId: z.string(),
        question: z.string(),   
        answer: z.string(),
        filesReferences: z.any()
    })).mutation(async ({ctx, input}) => {
        return await ctx.db.question.create({
            data: {
                projectId: input.projectId,
                userId: ctx.user.userId!,
                question: input.question,
                answer: input.answer,
                filesReferences: input.filesReferences
            }
        })
    }),
    getQuestions: protectedProcedure.input(z.object({projectId: z.string()})).query(async ({ctx, input}) => {
        return await ctx.db.question.findMany({
            where: {
                projectId: input.projectId
            },
            include: {
                user: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    })
})