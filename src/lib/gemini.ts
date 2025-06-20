import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Document } from '@langchain/core/documents'

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAi.getGenerativeModel({ model: 'gemini-1.5-flash' })

export const aiSummariseCommit = async (diff: string) => {
  const response = await model.generateContent(`
        Vous êtes un assistant IA qui résume les changements dans un diff git.
        
        Analysez le diff git suivant et fournissez un résumé clair et concis des changements effectués.
        Concentrez-vous sur:
        - Quels fichiers ont été modifiés, ajoutés ou supprimés
        - Le but principal ou l'intention des changements
        - Toutes les additions ou suppressions significatives
        - L'impact global de ces changements
        
        Gardez votre résumé professionnel et technique, mais accessible aux développeurs.
        Si le diff est vide ou ne contient pas de changements significatifs, indiquez-le.
        
        Voici le diff git à analyser:
        
        ${diff}
    `)
  return response.response.text()
}

export async function summariseCode(doc: Document) {
  console.log("Résumé du code pour", doc.metadata.source);
  try {
    const code = doc.pageContent.slice(0, 10000);
    const response = await model.generateContent(`
        Vous êtes un ingénieur logiciel senior qui spécialise dans l'accompagnement de développeurs juniors sur des projets.
        
        Vous accompagnez un développeur junior et leur expliquez le but du fichier ${doc.metadata.source} 
        Voici le code:
        ---------
        ${code}
        ---------
        Fournissez un résumé de moins de 100 mots du code ci-dessus
    `)
    return response.response.text()
  } catch (error) {
    console.error("Erreur lors de la résumé du code", error)
    return "Erreur lors de la résumé du code"
  }
}

export async function generateEmbedding(summary: string) {
  const model = genAi.getGenerativeModel({
    model: "text-embedding-004"
  })
  const result = await model.embedContent(summary)
  const embedding = result.embedding
  return embedding.values
}

// console.log(await generateEmbedding("hello world"))