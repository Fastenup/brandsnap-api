/**
 * Gemini AI Service for Brand Analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Style, BrandAnalysis } from '../types'

const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
}

/**
 * Analyze a brand from URL or description
 */
export async function analyzeBrand(
  input: string,
  inputType: 'url' | 'text',
  style: Style,
  customColors?: string
): Promise<BrandAnalysis> {
  const genAI = getGenAI()
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Analyze this ${inputType === 'url' ? 'website/brand URL' : 'brand description'} and extract brand information for visual design purposes.

Input: ${input}

Return a JSON object with:
{
  "brandName": "The brand/company name (short version if long)",
  "summary": "One sentence describing what this brand/company does",
  "industry": "Primary industry/sector (be specific: 'B2B SaaS', 'DTC Skincare', etc.)",
  "vibe": "3-4 words describing visual personality (e.g., 'Bold, Technical, Trustworthy')",
  "slogan": "A punchy marketing headline/tagline (max 5-6 words)",
  "cta": "A short Call to Action (e.g., 'Try for free', 'Get Started')",
  "title": "The page/site title or main headline found",
  "brandColors": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "iconConcept": "One word/concept that could represent this brand as an icon",
  "visualMetaphors": ["metaphor1", "metaphor2"],
  "twitterBio": "A 160-character optimized Twitter bio",
  "linkedinHeadline": "A professional LinkedIn headline (under 100 chars)"
}

${customColors ? `User specified these colors to use: ${customColors}` : ''}

Only return the JSON object, no markdown or explanation.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse brand analysis')

  const analysis = JSON.parse(jsonMatch[0]) as BrandAnalysis

  return { ...analysis, visualPrompt: '' }
}
