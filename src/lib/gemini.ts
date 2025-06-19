import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Document } from '@langchain/core/documents'

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAi.getGenerativeModel({ model: 'gemini-1.5-flash' })

export const aiSummariseCommit = async (diff: string) => {
  const response = await model.generateContent(`
        You are a helpful assistant that summarises the changes in a git diff.
        
        Please analyze the following git diff and provide a clear, concise summary of the changes made.
        Focus on:
        - What files were modified, added, or deleted
        - The main purpose or intent of the changes
        - Any significant additions or removals
        - The overall impact of these changes
        
        Keep your summary professional and technical, but accessible to developers.
        If the diff is empty or contains no meaningful changes, indicate that.
        
        Here is the git diff to analyze:
        
        ${diff}
    `)
  return response.response.text()
}

export async function summariseCode(doc: Document) {
  console.log("getting summary for", doc.metadata.source);
  try {
    const code = doc.pageContent.slice(0, 10000);
    const response = await model.generateContent(`
        You are an intelligent senior software engineer who specialises in onboarding junior software engineers on to projects.
        
        You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file 
        Here is the code:
        ---------
        ${code}
        ---------
        Give a summary no more than 100 words of the code above
    `)
    return response.response.text()
  } catch (error) {
    console.error("Error summarising code", error)
    return "Error summarising code"
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