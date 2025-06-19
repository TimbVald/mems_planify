import { Octokit } from "octokit"
import { db } from "~/server/db"
import axios from "axios"
import { aiSummariseCommit } from "./gemini"

// Initialisation de l'instance Octokit pour interagir avec l'API GitHub
// Utilise le token d'authentification stocké dans les variables d'environnement
export const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
})

// Type TypeScript définissant la structure d'une réponse de commit
// Contient toutes les informations nécessaires sur un commit GitHub
type Response = {
    commitMessage: string      // Message du commit
    commitHash: string         // Hash SHA du commit
    commitAuthorName: string   // Nom de l'auteur du commit
    commitAuthorAvatar: string // URL de l'avatar de l'auteur
    commitDate: string         // Date du commit
}

/**
 * Récupère les hashes des commits d'un repository GitHub
 * @param githubUrl - URL complète du repository GitHub
 * @returns Promise<Response[]> - Tableau des 10 commits les plus récents avec leurs détails
 */

export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
    try {
        // Extraction du propriétaire et du nom du repository depuis l'URL
        // Exemple: "https://github.com/docker/genai-stack" -> owner="docker", repo="genai-stack"
        // Exemple: "https://github.com/docker/genai-stack.git" -> owner="docker", repo="genai-stack"
        const urlParts = githubUrl.split("/")
        const lastPart = urlParts[urlParts.length - 1]
        const secondLastPart = urlParts[urlParts.length - 2]
        
        // Supprime l'extension .git si présente
        const repo = lastPart?.replace(/\.git$/, '')
        const owner = secondLastPart
        
        if (!owner || !repo) {
            throw new Error(`Invalid github url: ${githubUrl}`)
        }
        
        console.log(`Fetching commits for owner: ${owner}, repo: ${repo}`)
        
        // Appel à l'API GitHub pour récupérer la liste des commits
        const {data} = await octokit.rest.repos.listCommits({
            owner,
            repo,
        })
        
        // Tri des commits par date (du plus récent au plus ancien)
        const sortedCommits = data.sort((a: any, b: any) => 
            new Date(b.commit.author.date || '').getTime() - new Date(a.commit.author.date || '').getTime()
        ) as any[]
        
        // Retourne les 10 premiers commits avec leurs détails formatés
        return sortedCommits.slice(0, 10).map((commit: any) => ({
            commitMessage: commit.commit.message ?? 'No message',
            commitHash: commit.sha as string,
            commitAuthorName: commit.commit?.author?.name ?? "",
            commitAuthorAvatar: commit.author?.avatar_url ?? "",
            commitDate: commit.commit?.author?.date ?? "",
        }))
    } catch (error) {
        console.error('Error fetching commits:', error)
        throw new Error(`Failed to fetch commits from ${githubUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

/**
 * Fonction principale pour surveiller les nouveaux commits d'un projet
 * @param projectId - ID du projet dans la base de données
 * @returns Promise<Response[]> - Liste des commits non traités
 */
export const pollCommits = async (projectId: string) => {
    try {
        // Récupère l'URL GitHub associée au projet
        const {project, githubUrl} = await fetchProjectGithubUrl(projectId)
        
        // Récupère tous les commits du repository
        const commitsHashes = await getCommitHashes(githubUrl)
        
        // Filtre pour ne garder que les commits non traités
        const unprocessedCommits = await filterUnprocessedCommits(projectId, commitsHashes)

        const summaryResponses = await Promise.allSettled(unprocessedCommits.map(commit => {
            return summariseCommits(githubUrl, commit.commitHash)
        }))
        const summaries = summaryResponses.map((response) => {
            if (response.status === 'fulfilled') {
                return response.value as string
            }
            return "No summary available"
        })
        // console.log(summaries)

        const commits = await db.commit.createMany({
            data: summaries.map((summary, index) => {
                console.log(`Creating commit ${index}`)
                return {
                    projectId: projectId,
                    commitMessage: unprocessedCommits[index]!.commitMessage,
                    commitHash: unprocessedCommits[index]!.commitHash,
                    commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
                    commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
                    commitdate: unprocessedCommits[index]!.commitDate,
                    summary
                }
            })
        })

        return commits
        
    } catch (error) {
        console.error('Error polling commits:', error)
        throw error
    }
}

/**
 * Fonction pour résumer les commits (non implémentée)
 * @param githubUrl - URL du repository GitHub
 * @param commitHash - Hash du commit à résumer
 */
async function summariseCommits(githubUrl: string, commitHash: string) {
    // TODO: Implémenter la logique de résumé des commits
    const {data} = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
        headers: {
            Accept: 'application/vnd.github.v3.diff'
        }
    })
    return await aiSummariseCommit(data) || "No summary available"
}

/**
 * Récupère l'URL GitHub associée à un projet depuis la base de données
 * @param projectId - ID du projet
 * @returns Promise<{project, githubUrl}> - Projet et son URL GitHub
 */
async function fetchProjectGithubUrl(projectId: string) {
    try {
        // Recherche du projet dans la base de données
        const project = await db.project.findUnique({
            where: {
                id: projectId,
            },
            select: {
                githubUrl: true
            }
        })
        
        // Vérification que le projet existe et a une URL GitHub
        if (!project?.githubUrl) {
            throw new Error("Project not found or no github url")
        }
        
        return {
            project,
            githubUrl: project.githubUrl,
        }
    } catch (error) {
        console.error('Error fetching project GitHub URL:', error)
        throw new Error(`Failed to fetch project GitHub URL for project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

/**
 * Filtre les commits pour ne garder que ceux qui n'ont pas encore été traités
 * @param projectId - ID du projet
 * @param commitsHashes - Liste de tous les commits récupérés
 * @returns Promise<Response[]> - Liste des commits non traités
 */
async function filterUnprocessedCommits(projectId: string, commitsHashes: Response[]): Promise<Response[]> {
    try {
        // Récupère tous les commits déjà traités pour ce projet
        const processedCommits = await db.commit.findMany({
            where: {
                projectId,
            },
        })
        
        // Filtre les commits en excluant ceux déjà présents en base
        const unprocessedCommits = commitsHashes.filter((commit) => 
            !processedCommits.some((c) => c.commitHash === commit.commitHash)
        )
        return unprocessedCommits
    } catch (error) {
        console.error('Error filtering unprocessed commits:', error)
        throw new Error(`Failed to filter unprocessed commits for project ${projectId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

// Test de la fonction pollCommits avec un ID de projet spécifique
await pollCommits('cmbyawgjr0000ryy0d6w9hvwg').then(console.log)