/**
 * Image Generation Service
 * 
 * Uses:
 * - Gemini 3 Pro Image for banners (supports custom aspect ratios)
 * - Imagen 4 for favicons (1:1 square)
 */

import { GoogleGenAI } from '@google/genai'
import type { Style, Platform, BrandAnalysis } from '../types'

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Platform-specific aspect ratios
const PLATFORM_RATIOS: Record<Platform, string> = {
  twitter: '3:1',    // 1500×500
  linkedin: '4:1',   // 1584×396
  youtube: '16:9',   // 2560×1440
  facebook: '8:3',   // 820×312 ≈ 2.6:1, closest common ratio
  og: '1200:630',    // OG images are 1200×630
}

/**
 * Generate banner using Gemini 3 Pro Image
 * Supports custom aspect ratios for each platform
 */
export async function generateBannerWithImagen(
  brandAnalysis: BrandAnalysis,
  platform: Platform,
  style: Style
): Promise<string> {
  const ai = getClient()
  const aspectRatio = PLATFORM_RATIOS[platform]

  // Always use our text-focused prompt
  // NOTE: We ignore brandAnalysis.visualPrompt because it's designed for abstract 
  // backgrounds without text. Brand assets need actual text (slogan, CTA, etc.)
  const prompt = `Create a professional ${platform} banner for "${brandAnalysis.brandName}".

**BRAND INFORMATION:**
- Brand Name: ${brandAnalysis.brandName}
- Industry: ${brandAnalysis.industry || 'Technology'}
- What they do: ${brandAnalysis.summary || 'Modern digital service'}

**EXACT TEXT TO DISPLAY ON THE BANNER (use these exact words):**
1. Brand Name (large): "${brandAnalysis.brandName}"
2. Tagline/Slogan: "${brandAnalysis.slogan || ''}"
3. Call-to-Action button: "${brandAnalysis.cta || 'Get Started'}"

**STYLE:** ${style}

**DESIGN REQUIREMENTS:**
- Display ALL three text elements prominently
- Brand name should be the largest text
- Slogan should be readable supporting text  
- CTA should look like a button
- Wide landscape banner, fill the entire canvas
- Premium marketing asset quality
- 8K, highly detailed

**CRITICAL: Do NOT invent new slogans or taglines. Use EXACTLY the text provided above.**`
  
  // Log the actual prompt being used
  console.log(`[Imagen] Prompt for ${platform}:`)
  console.log(`  Brand: ${brandAnalysis.brandName}`)
  console.log(`  Slogan: ${brandAnalysis.slogan}`)
  console.log(`  CTA: ${brandAnalysis.cta}`)
  console.log(`  visualPrompt provided: ${brandAnalysis.visualPrompt ? 'YES' : 'NO'}`)

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating ${platform} banner (${aspectRatio}), attempt ${attempt + 1}`)
      
      // Use Gemini 3 Pro Image for custom aspect ratios
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt + ` (Variation Seed: ${Date.now()})`,
        config: {
          responseModalities: ['Image'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: '4K'
          }
        } as any
      })

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) {
          console.log(`[Imagen] Successfully generated ${platform} banner`)
          return `data:image/png;base64,${(part as any).inlineData.data}`
        }
      }
      
      throw new Error('No image data in response')
    } catch (error: any) {
      lastError = error
      console.error(`[Imagen] Attempt ${attempt + 1} failed:`, error.message)
      
      if (error.status === 429 || error.status === 503 || error.message?.includes('overloaded')) {
        const waitTime = Math.pow(2, attempt + 1) * 2000
        console.log(`[Imagen] Waiting ${waitTime}ms before retry...`)
        await wait(waitTime)
        continue
      }
      break
    }
  }
  
  console.error(`[Imagen] All attempts failed for ${platform}`)
  throw lastError || new Error('Image generation failed after retries')
}

/**
 * Generate professional logo using Gemini 3 Pro Image
 * Unlike favicon (icon-only, no text), logos include the brand name as text
 * combined with a symbol/mark for a complete logo design.
 */
export async function generateLogoWithImagen(
  brandAnalysis: BrandAnalysis,
  style: Style
): Promise<string> {
  const ai = getClient()
  const primaryColor = brandAnalysis.brandColors[0] || '#3b82f6'
  const secondaryColor = brandAnalysis.brandColors[1] || '#ffffff'

  // Map style to logo design aesthetic
  const logoStyles: Record<Style, string> = {
    blueprint: 'Technical, precise logo with thin lines, dark navy background, cyan accents, engineering/architect feel',
    brutalism: 'Bold neo-brutalist logo, heavy black strokes, stark contrast, raw geometric letterforms, punk energy',
    isometric: 'Isometric 3D logo mark with clean lettering, soft shadows, playful modern tech aesthetic',
    fluid: 'Ethereal glass-morphism logo, iridescent gradient mark, elegant thin typography, premium luxury feel',
    collage: 'Mixed media textured logo, layered paper-cut mark, artistic handcraft quality, creative agency vibe',
    explainer: 'Clean flat vector logo, friendly sans-serif type, minimal symbol, approachable SaaS aesthetic',
    minimal: 'Ultra-minimal logo, geometric monogram or wordmark, maximum whitespace, refined elegance',
    gradient: 'Aurora gradient logo mark with clean modern type, smooth flowing colors, fintech/app aesthetic',
    geometric: 'Geometric pattern-based logo mark, interlocking shapes, mathematical precision, bold type',
    retro: 'Vintage retro logo, warm 70s-80s palette, rounded badge style, nostalgic hand-lettered feel',
  }

  const prompt = `Design a professional brand logo for "${brandAnalysis.brandName}".

**BRAND CONTEXT:**
- Brand Name: ${brandAnalysis.brandName}
- Industry: ${brandAnalysis.industry || 'Technology'}
- What they do: ${brandAnalysis.summary || 'Modern digital service'}
- Icon concept: ${brandAnalysis.iconConcept || 'abstract symbol representing the brand'}

**LOGO REQUIREMENTS:**
- The brand name "${brandAnalysis.brandName}" MUST appear as text in the logo
- Combine a distinctive symbol/mark with the brand name text
- Think combination mark (symbol + wordmark together)
- Primary color: ${primaryColor}
- Secondary color: ${secondaryColor}
- Clean background (solid color or white)
- Square 1:1 format
- Must work at small sizes (social media profile pic) and large (website header)
- Professional, memorable, simple, distinctive
- Dribbble/Behance portfolio quality

**DESIGN STYLE:** ${logoStyles[style] || logoStyles.minimal}

**CRITICAL RULES:**
- The brand name "${brandAnalysis.brandName}" MUST be clearly readable as text
- Do NOT just create an icon — this is a LOGO with text
- Do NOT add taglines, slogans, or extra text beyond the brand name
- No stock photo elements, no clip art
- No busy backgrounds — keep it clean
- The mark/symbol should be unique to this brand
- Typography should feel intentional and styled, not default

**QUALITY:**
- Vector-like crisp edges
- High resolution
- Would look professional on a business card, website, or app store`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating logo, attempt ${attempt + 1}`)
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt + ` (Variation Seed: ${Date.now()})`,
        config: {
          responseModalities: ['Image'],
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '4K'
          }
        } as any
      })

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) {
          console.log(`[Imagen] Successfully generated logo`)
          return `data:image/png;base64,${(part as any).inlineData.data}`
        }
      }
      
      throw new Error('No image data in response')
    } catch (error: any) {
      lastError = error
      console.error(`[Imagen] Logo attempt ${attempt + 1} failed:`, error.message)
      
      if (error.status === 429 || error.status === 503 || error.message?.includes('overloaded')) {
        const waitTime = Math.pow(2, attempt + 1) * 2000
        console.log(`[Imagen] Waiting ${waitTime}ms before retry...`)
        await wait(waitTime)
        continue
      }
      break
    }
  }
  
  throw lastError || new Error('Logo generation failed after retries')
}

/**
 * Generate favicon/icon using Imagen 4 (better for 1:1 icons)
 */
export async function generateIconWithImagen(
  brandAnalysis: BrandAnalysis,
  style: Style
): Promise<string> {
  const ai = getClient()
  const primaryColor = brandAnalysis.brandColors[0] || '#3b82f6'
  const secondaryColor = brandAnalysis.brandColors[1] || '#ffffff'

  // Map style to icon aesthetic
  const iconStyles: Record<Style, string> = {
    blueprint: 'Technical schematic icon, cyan lines on dark navy, circuit aesthetic',
    brutalism: 'Bold neo-brutalist icon, heavy black borders, neon accent, raw',
    isometric: 'Isometric 3D icon, soft shadows, claymorphism, playful tech',
    fluid: 'Ethereal glass icon, iridescent gradients, flowing organic shape',
    collage: 'Mixed media textured icon, paper-cut layers, artsy creative',
    explainer: 'Flat vector icon, clean minimal shapes, friendly SaaS aesthetic',
    minimal: 'Ultra-minimal geometric icon, one shape, maximum whitespace',
    gradient: 'Aurora gradient icon, smooth flowing colors, modern app style',
    geometric: 'Geometric pattern icon, interlocking shapes, mathematical',
    retro: 'Vintage retro icon, warm 70s colors, halftone texture, nostalgic',
  }

  const prompt = `Create a premium app icon for "${brandAnalysis.brandName}".

Brand: ${brandAnalysis.brandName} - ${brandAnalysis.industry || 'Technology'}
What they do: ${brandAnalysis.summary || 'Digital service'}
Icon concept: ${brandAnalysis.iconConcept || 'abstract symbol'}

Use these colors in the design (do NOT display as text): primary color is a teal/green, secondary is dark navy.

Style: ${iconStyles[style] || iconStyles.minimal}

Requirements:
- Square 1:1 format, works at 16px to 512px
- SINGLE distinctive symbol representing "${brandAnalysis.brandName}"
- Can include a stylized single letter from brand name if appropriate
- Strong silhouette, works in monochrome
- NO text, NO words, NO letters except possibly one stylized initial
- NO hex codes or color codes visible
- Centered with ~15% padding
- Crisp vector-like edges
- App Store quality

Critical: UNIQUE to this brand, not generic. Memorable and distinctive.`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating favicon, attempt ${attempt + 1}`)
      
      // Use Imagen 4 for 1:1 icons
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          aspectRatio: '1:1',
          numberOfImages: 1,
        }
      })

      const imageData = response.generatedImages?.[0]?.image?.imageBytes
      if (imageData) {
        console.log(`[Imagen] Successfully generated favicon`)
        return `data:image/png;base64,${imageData}`
      }
      
      throw new Error('No icon data in response')
    } catch (error: any) {
      lastError = error
      console.error(`[Imagen] Favicon attempt ${attempt + 1} failed:`, error.message)
      
      if (error.status === 429 || error.status === 503 || error.message?.includes('overloaded')) {
        const waitTime = Math.pow(2, attempt + 1) * 2000
        console.log(`[Imagen] Waiting ${waitTime}ms before retry...`)
        await wait(waitTime)
        continue
      }
      break
    }
  }
  
  throw lastError || new Error('Favicon generation failed after retries')
}
