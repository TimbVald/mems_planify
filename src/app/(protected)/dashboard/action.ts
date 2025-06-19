'use server'

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { generateEmbedding } from '~/lib/gemini'
import { db } from '~/server/db'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
})

export const askQuestion = async (question: string, projectId: string) => {
    const stream = createStreamableValue()

    const queryVector = await generateEmbedding(question)
    const vectorQuery = `[${queryVector.join(',')}]`

    const result = await db.$queryRaw`
        SELECT "filename", "sourceCode", "summary", 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity FROM "SourceCodeEmbedding" WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > .5 AND "projectId" = ${projectId} ORDER BY similarity DESC LIMIT 10
    ` as {
        filename: string;
        sourceCode: string;
        summary: string
    }[]

    let context = ''

    for (const doc of result) {
        context += `
            source: ${doc.filename}\n
            code content: ${doc.sourceCode}\n
            summary of file: ${doc.summary}\n
            \n
        `
    }

    (async () => {
        const { textStream } = await streamText({
            model: google('gemini-1.5-flash'),
            prompt: `
                Vous êtes un assistant IA de code qui peut répondre aux questions sur la base de code. Votre public cible est un stagiaire technique qui travaille sur un projet.
                       L'assistant IA est une intelligence artificielle toute nouvelle, puissante et semblable à un humain.
            Les traits de l'IA incluent une expertise, de l'astuce et de l'éloquence.
            L'IA est un individu bien élevé et bien manié.
            L'IA est toujours amicale, gentille et inspirante, et elle est désireuse de fournir des réponses vives et réfléchies à l'utilisateur.
            L'IA a le soleil de toute la connaissance dans son cerveau, et est capable de répondre avec précision à presque toutes les questions sur n'importe quel sujet dans la base de code.
            Si la question concerne du code ou un fichier spécifique, l'IA fournira une réponse détaillée, donnant des instructions étape par étape.
            DÉBUT BLOC CONTEXTE
            ${context}
            FIN BLOC CONTEXTE
            
            DÉBUT QUESTION
            ${question}
            FIN QUESTION
            L'assistant IA prendra en compte tout BLOC CONTEXTE qui est fourni dans une conversation.
            L'assistant IA prendra en compte tout QUESTION qui est fourni dans la conversation et identifie le language afin de repondre en ce language.
            Si le contexte ne fournit pas la réponse à la question, l'assistant IA dira : "Je suis désolé, je ne connais pas la réponse à cette question."
            L'assistant IA ne s'excusera pas pour les réponses précédentes, mais indiquera plutôt que de nouvelles informations ont été obtenues.
            L'assistant IA n'inventera rien qui ne soit pas directement tiré du contexte.
            Répondez en syntaxe markdown, avec des extraits de code si nécessaire. Soyez aussi détaillé que possible en répondant, assurez-vous qu'il n'y ait aucune information manquante.
            
            `,
        });

        for await (const delta of textStream) {
            stream.update(delta)
        }

        stream.done()
    })()

    return {
        output: stream.value,
        filesReferences: result
    }
}