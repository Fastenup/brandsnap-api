/**
 * Gemini AI Service for Brand Analysis
 * 
 * Acts as "Creative Director" - researches brand, understands style constraints,
 * and generates custom visualPrompt for image generation.
 */

import { GoogleGenAI } from '@google/genai'
import type { Style, BrandAnalysis } from '../types'

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

// Style-specific visual guides for the Creative Director
const STYLE_GUIDES: Record<Style, string> = {
  blueprint: `**STYLE: ORTHOGRAPHIC BLUEPRINT / SCHEMATIC**
- Full-width technical schematic on dark engineering background (#0a1628)
- Detailed white/cyan line drawings, grid lines, measurement annotations
- Show the brand concept as exploded technical diagrams
- CAD drawing or patent application aesthetic
- Precise, Technical, Architectural, Complex
- NO photorealism`,

  brutalism: `**STYLE: NEO-BRUTALISM / WEB AESTHETIC**
- Stark contrast, heavy black borders (4px+ strokes)
- Raw unpolished look, UI elements, browser windows, retro computer aesthetics
- High saturation neon colors against stark black/white
- Glitch artifacts, system fonts used decoratively
- Raw, Honest, Retro-future, Developer-centric`,

  isometric: `**STYLE: 3D ISOMETRIC RENDER**
- Sprawling miniature 3D world or complex machinery
- Strict 30-degree isometric perspective
- Soft global illumination, soft shadows, claymorphism/plastic sheen
- Show brand ecosystem as a 3D city, factory, or scene
- Playful, Tech-forward, Gamified, Detailed`,

  fluid: `**STYLE: ETHEREAL FLUID / ABSTRACT 3D**
- Liquid gradients, mesh gradients, glassmorphism
- Flowing abstract shapes suggesting motion and connectivity
- Deep iridescent colors, high-end gloss finish
- Futuristic, Premium, AI, Web3, Flowing aesthetic`,

  collage: `**STYLE: MIXED MEDIA DIGITAL COLLAGE**
- Edge-to-edge artistic composition
- Cut-out elements, ripped paper edges, halftone dots, grain textures
- Vintage imagery juxtaposed with modern tech elements
- Bold contrasting colors, desaturated photos mixed with vibrant vectors
- Artsy, Disruptive, Creative, Editorial`,

  explainer: `**STYLE: FLAT VECTOR / GRAPHIC EXPLAINER**
- "Corporate Memphis" style high-quality vector art
- Visual narrative scene spanning the banner width
- Characters using the product, or abstract service flow representations
- Pastel background with bold primary accents
- Friendly, Accessible, SaaS, Startup
- No shading, no gradients, pure flat vector`,

  minimal: `**STYLE: ULTRA-MINIMAL**
- Maximum whitespace or single color field
- One focal element, perfectly placed
- Monochromatic or 2 colors maximum
- Geometric purity: circles, lines, squares
- Apple or Muji aesthetic, sophisticated simplicity`,

  gradient: `**STYLE: AURORA GRADIENT**
- Smooth flowing mesh gradients
- 3-4 colors blending seamlessly with depth
- Subtle grain texture overlay for organic feel
- iOS wallpaper or Stripe aesthetic
- Modern, Premium, Tech-forward`,

  geometric: `**STYLE: GEOMETRIC PATTERNS**
- Repeating or interlocking shapes, tessellations
- Bold color blocking within shapes
- Mathematical precision, perfect symmetry
- Op-art or Bauhaus influence
- Architectural, Data-driven aesthetic`,

  retro: `**STYLE: RETRO VINTAGE 70s-80s**
- Orange, brown, teal, cream color palette
- Halftone dots, sun rays, rounded corners
- Grain, scratches, aged paper texture
- Nostalgic warmth, analog feeling
- Vintage travel poster or record sleeve vibe`,
}

/**
 * Analyze a brand and generate a custom visualPrompt
 * 
 * Acts as Creative Director: researches brand, applies style constraints,
 * outputs a tailored image generation prompt.
 */
export async function analyzeBrand(
  input: string,
  inputType: 'url' | 'text',
  style: Style,
  customColors?: string
): Promise<BrandAnalysis> {
  const ai = getClient()
  const styleGuide = STYLE_GUIDES[style] || STYLE_GUIDES.minimal

  // Build research instructions based on input type
  let researchInstructions = ''
  let tools: any = undefined

  if (inputType === 'url') {
    const cleanUrl = input.replace(/^https?:\/\//, '').replace(/\/$/, '')
    researchInstructions = `
**Task**: Analyze the brand associated with this URL: "${input}"

1. **Deep Research**:
   - Search for: "${cleanUrl}", "site:${cleanUrl}", "${cleanUrl} about"
   - Extract the specific product offering, value proposition, and brand vibe
   - If limited results, infer from URL structure and naming patterns
`
    tools = [{ google_search_retrieval: {} }]
  } else {
    researchInstructions = `
**Task**: Analyze the brand based on this description: "${input}"

1. **Analysis**:
   - Identify the brand name, value proposition, and target audience
   - Understand the core offering and differentiators
`
  }

  // Color instructions
  const colorInstruction = customColors
    ? `**COLOR CONSTRAINT**: The design MUST use these brand colors: ${customColors}`
    : 'Extract representative brand colors from the analysis.'

  const prompt = `You are a world-class Marketing Director and Brand Strategist.

${researchInstructions}

2. **Strategy**: Create a marketing profile to promote this brand effectively.

3. **Visual Direction**: 
   - Create a "visualPrompt" for an AI image generator to create banner assets
   ${styleGuide}
   - ${colorInstruction}
   - **CRITICAL**: The visual art must EXPLAIN the brand's niche and value proposition through symbolism and composition
   - **IMPORTANT**: The visualPrompt MUST include:
     * The EXACT brand name as prominent typography
     * The EXACT slogan/tagline you create (do NOT shorten or paraphrase)
     * A brief value proposition text (1 line)
   - Fill the entire canvas - this is a wide landscape banner

Return ONLY a valid JSON object:
{
  "brandName": "The brand/company name",
  "summary": "2-3 sentence description of what this brand does, their value proposition, and target audience",
  "industry": "Specific industry (e.g., 'B2B SaaS', 'DTC Skincare', 'Social Media')",
  "vibe": "3-4 words describing visual personality",
  "slogan": "The EXACT marketing tagline to display on the banner (5-8 words max)",
  "cta": "Short Call to Action button text",
  "title": "The page title or main headline found on site",
  "brandColors": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "iconConcept": "One concept that could represent this brand as an icon",
  "visualPrompt": "DETAILED image generation prompt. MUST include: 1) Exact brand name placement, 2) The EXACT slogan text, 3) Style-specific visual elements, 4) Color usage, 5) Composition details. Do NOT create a new tagline - use the slogan field exactly.",
  "twitterBio": "160-char Twitter bio with hashtags/emojis",
  "linkedinHeadline": "Professional LinkedIn headline under 100 chars"
}`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: tools,
      },
    })

    const text = response.text || '{}'
    console.log('[Gemini] Raw response length:', text.length)
    console.log('[Gemini] Raw response preview:', text.slice(0, 500))
    
    // More flexible JSON extraction - handle various markdown formats
    let jsonStr = text
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    } else {
      const jsonObjMatch = text.match(/\{[\s\S]*\}/)
      if (jsonObjMatch) {
        jsonStr = jsonObjMatch[0]
      }
    }
    
    console.log('[Gemini] Parsed JSON preview:', jsonStr.slice(0, 300))

    const data = JSON.parse(jsonStr)
    console.log('[Gemini] Brand:', data.brandName, '| visualPrompt length:', data.visualPrompt?.length || 0)

    return {
      brandName: data.brandName || 'Brand',
      summary: data.summary || 'Modern digital service',
      industry: data.industry || 'Technology',
      vibe: data.vibe || 'Modern, Professional',
      slogan: data.slogan || 'Innovation for everyone',
      cta: data.cta || 'Get Started',
      title: data.title || data.brandName || 'Brand',
      brandColors: data.brandColors || ['#3b82f6', '#ffffff', '#000000'],
      iconConcept: data.iconConcept || 'abstract symbol',
      visualPrompt: data.visualPrompt || '',
      twitterBio: data.twitterBio || '',
      linkedinHeadline: data.linkedinHeadline || '',
    }
  } catch (error: any) {
    console.error('[Gemini] Analysis error:', error.message)
    throw new Error('Failed to analyze brand. Please try again.')
  }
}
